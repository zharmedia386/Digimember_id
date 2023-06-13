import makeWASocket, { DisconnectReason, useMultiFileAuthState, MessageType, downloadMediaMessage   } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { writeFile, readFile } from 'fs/promises'
import Jimp from "jimp";
import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, addDoc, updateDoc, deleteDoc, collection, doc, query, where } from 'firebase/firestore';
import { getStorage, listAll, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import mime from 'mime-types';
import * as ExcelJS from 'exceljs';

const firebaseConfig = {
    apiKey: "AIzaSyCnii7QCWf_ln0WvkeAPBN9p3xUCAQIzbs",
    authDomain: "digimember-3166a.firebaseapp.com",
    projectId: "digimember-3166a",
    storageBucket: "digimember-3166a.appspot.com",
    messagingSenderId: "1076910703361",
    appId: "1:1076910703361:web:881074076f9a8d9ef71100"
};

// firebase config
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

async function connectToWhatsApp () {
    const {state, saveCreds} = await useMultiFileAuthState('auth');
    const sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth: state,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                // || message.templateMessage
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },            
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            console.log('opened connection')
        }
    })
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];

        // get what type of message it is -- text, image, video
        const messageType = Object.keys (msg.message!)[0];
        
        // Retrieve data from firebase based on Current User WhatsApp Number
        let userData = await getUserDataFromWhatsappNumber(msg.key.remoteJid!.replace('@s.whatsapp.net','').replace('@g.us',''))

        // Define global variables
        let NOMOR_ADMIN = '6289668741500' // EDIT NOMOR ADMIN HERE!!
        NOMOR_ADMIN += '@s.whatsapp.net'

        let nomorAnggota = '';
        let namaLengkap = '';
        let waktuValiditas = '';
        let status = '';

        let nomorAnggotaFromFirebase = '';
        let namaLengkapFromFirebase = '';
        let waktuValiditasFromFirebase = '';

        let responseButton = msg.message.buttonsResponseMessage;

        if(userData) {
            status = userData.status;
        }

        let role = '';
        if(msg.key.remoteJid!.replace('@s.whatsapp.net','') == '6289668741500') {
            role = 'admin';
        } else {
            role = 'user';
        }

        if(!msg.key.fromMe && m.type === 'notify') {
            if(msg.message!.conversation?.includes('Nama Lengkap: ') && msg.message!.conversation?.includes('Nomor Anggota:') && msg.message!.conversation?.includes('Waktu Validitas:')){
                // Get only the value of namaLengkap, nomorAnggota, waktuValiditas
                namaLengkap = msg.message!.conversation?.split('Nomor Anggota:')[0];
                namaLengkap = namaLengkap.replace('Nama Lengkap: ','').replace(/(?:\r\n|\r|\n)/g, '');
                
                nomorAnggota = msg.message!.conversation?.split('Waktu Validitas:')[0];
                nomorAnggota = nomorAnggota.split('Nomor Anggota: ')[1];
                nomorAnggota = nomorAnggota.replace('Nomor Anggota: ','').replace(/(?:\r\n|\r|\n)/g, '');
                
                waktuValiditas = msg.message!.conversation?.split('Waktu Validitas:')[1];
                waktuValiditas = waktuValiditas.replace('Waktu Validitas: ','').replace(/(?:\r\n|\r|\n)/g, '');

                status = 'registered';

                // if user document in firebase is found with the current user's nomorTelfon
                if(userData) {
                    nomorAnggotaFromFirebase = userData.nomorAnggota;
                    namaLengkapFromFirebase = userData.namaLengkap;
                    waktuValiditasFromFirebase = userData.waktuValiditas;
                }

                // Validate that one user should have one document in firebase with nomorTelfon constraints
                // if there is document with current nomorTelfon, then send message that user has already logged with document content
                // else, the user data will be stored in firebase 
                if (nomorAnggotaFromFirebase && namaLengkapFromFirebase && waktuValiditasFromFirebase) {
                    const sendMsg = await sock.sendMessage(msg.key.remoteJid!, {text: `Anda sudah mendaftar akun sebelumnya dan masih tersimpan dalam database!\n\nBerikut datanya:\nNama Lengkap: ${namaLengkap}\nNomor Anggota: ${nomorAnggota}\nWaktu Validitas: ${waktuValiditas}\n\nSilakan langsung lampirkan pas foto 3x4 dalam bentuk gambar\nFormat JPEG, JPG, PNG` })
                } else {
                    // Add Documents namaLengkap, nomorAnggota, waktuValiditas to Users collection in Firebase Database
                    const user = collection(db, 'Users');
                    await addDoc(user, {
                        "namaLengkap": namaLengkap,
                        "nomorAnggota": nomorAnggota,
                        "waktuValiditas": waktuValiditas,
                        "nomorTelfon": msg.key.remoteJid!.replace('@s.whatsapp.net','').replace('@g.us',''),
                        "status": status
                    });
                    
                    const sendMsg = await sock.sendMessage(msg.key.remoteJid!, {text: "Terima kasih! Nama Lengkap, Nomor Anggota, dan Waktu Validitas sudah tersimpan..\n\nSilakan lampirkan pas foto 3x4 dalam bentuk gambar\nFormat JPEG, JPG, PNG" })
                }
            } else if (messageType === 'imageMessage' && status == 'registered') {
                status = 'pending';
                
                // Edit Documents status PENDING to Users collection in Firebase Database
                const userRef = collection(db, 'Users');
                const querySnapshot = await getDocs(query(userRef, where('nomorTelfon', '==', userData.nomorTelfon)));

                querySnapshot.forEach((adminRequestDoc) => {
                    const userDocRef = doc(db, 'Users', adminRequestDoc.id);
                    updateDoc(userDocRef, {
                        "namaLengkap": userData.namaLengkap,
                        "nomorAnggota": userData.nomorAnggota,
                        "waktuValiditas": userData.waktuValiditas,
                        "nomorTelfon": msg.key.remoteJid!.replace('@s.whatsapp.net','').replace('@g.us',''),
                        "status": status
                    });
                });

                // Download image from users
                const buffer = await downloadMediaMessage(
                    msg,
                    'buffer',
                    {},
                )

                // Save image sent to the server with memberId as filename
                await writeFile(`uploads\\pasfoto\\${userData.nomorAnggota}.png`, buffer)

                const sendMsg = await sock.sendMessage(msg.key.remoteJid!, {text: "Terima kasih! Pas foto anda sudah tersimpan..\n\n1 Langkah terakhir..Silakan lampirkan bukti pembayaran dalam bentuk gambar\nFormat JPEG, JPG, PNG" })

            } else if (messageType === 'imageMessage' && status === 'pending') {
                status = 'validated';

                // Edit Documents status PENDING to Users collection in Firebase Database
                const userRef = collection(db, 'Users');
                const querySnapshot = await getDocs(query(userRef, where('nomorTelfon', '==', userData.nomorTelfon)));

                querySnapshot.forEach((adminRequestDoc) => {
                    const userDocRef = doc(db, 'Users', adminRequestDoc.id);
                    updateDoc(userDocRef, {
                        "namaLengkap": userData.namaLengkap,
                        "nomorAnggota": userData.nomorAnggota,
                        "waktuValiditas": userData.waktuValiditas,
                        "nomorTelfon": msg.key.remoteJid!.replace('@s.whatsapp.net','').replace('@g.us',''),
                        "status": status
                    });
                });

                // Download image from users
                const buffer = await downloadMediaMessage(
                    msg,
                    'buffer',
                    {},
                )

                // Save image sent to the server with memberId as filename
                await writeFile(`uploads\\buktiTransfer\\${userData.nomorAnggota}.png`, buffer)

                const sendMsg = await sock.sendMessage(msg.key.remoteJid!, {text: "Foto Bukti Transfer anda sudah tersimpan..\n\nSilakan tunggu beberapa waktu untuk menunggu konfirmasi dari Admin Setempat" })

                ///////////////////////////////////
                //// SEND CONFIRMATION TO ADMIN
                //// Delay time to avoid spamming alert
                ///////////////////////////////////

                // send pasfoto image from Firebase storage
                setTimeout(async() => {
                    await sock.sendMessage(NOMOR_ADMIN, { 
                        image: {
                            url:`uploads\\pasfoto\\${userData.nomorAnggota}.png`
                        }
                    });
                }, 5000);

                // send bukti transfer image from Firebase storage
                setTimeout(async() => {
                    await sock.sendMessage(NOMOR_ADMIN, { 
                        image: {
                            url:`uploads\\buktiTransfer\\${userData.nomorAnggota}.png`
                        }
                    });
                }, 5000);
                
                // Validation Buttons
                const textMessage = `${userData.namaLengkap} melakukan registrasi berikut data, pas foto, dan bukti transfernya:\n\nNama Lengkap: ${userData.namaLengkap}\nNomor Anggota: ${userData.nomorAnggota}\nWaktu Validitas: ${userData.waktuValiditas}`

                const validateTextTemplateButton = `nomorTelfonValidate: ${userData.nomorTelfon}`;
                const notValidateTextTemplateButton = `nomorTelfonNotValidate: ${userData.nomorTelfon}`;
                const buttons = [
                    // RETURN number of requested user for recognition
                    {buttonId: validateTextTemplateButton, buttonText: {displayText: 'YA!'}, type: 1},
                    {buttonId: notValidateTextTemplateButton, buttonText: {displayText: 'TIDAK!'}, type: 1},
                ]
                const buttonInfo = {
                    text: textMessage,
                    buttons: buttons,
                    headerType: 1,
                    viewOnce:true
                }

                setTimeout(async() => {
                    await sock.sendMessage(NOMOR_ADMIN, buttonInfo);
                }, 5000);

            } else if (((responseButton?.selectedButtonId && status === 'validated') || role === 'admin')) {
                status = 'registered';

                // GET number of requested user
                let requestedUserNumber = responseButton?.selectedButtonId;
                console.log("RESPONSE BUTTON:", requestedUserNumber)
                requestedUserNumber = requestedUserNumber.replace('nomorTelfonValidate: ','').replace('nomorTelfonNotValidate: ','');
                
                let requestedUserNumberSend;
                
                if(msg.key.remoteJid!.startsWith(' 62') && msg.key.remoteJid!.length >= 10 && msg.key.remoteJid!.length <= 13) {
                    requestedUserNumberSend = requestedUserNumber + "@s.whatsapp.net";
                } else {
                    requestedUserNumberSend = requestedUserNumber + "@g.us";
                }
                console.log("RESPONSE SEND:", requestedUserNumberSend)
                
                // Retrieve data from firebase based on Requested User WhatsApp Number
                let requestedUserData = await getUserDataFromWhatsappNumber(requestedUserNumber)
                
                // Edit Documents status PENDING to Users collection in Firebase Database
                const userRef = collection(db, 'Users');
                const querySnapshot = await getDocs(query(userRef, where('nomorTelfon', '==', requestedUserData.nomorTelfon)));
                
                querySnapshot.forEach((adminRequestDoc) => {
                    const userDocRef = doc(db, 'Users', adminRequestDoc.id);
                    updateDoc(userDocRef, {
                        "namaLengkap": requestedUserData.namaLengkap,
                        "nomorAnggota": requestedUserData.nomorAnggota,
                        "waktuValiditas": requestedUserData.waktuValiditas,
                        "nomorTelfon": requestedUserNumber,
                        "status": status
                    });
                });

                // If VALIDATE
                if(responseButton?.selectedButtonId.includes("nomorTelfonValidate: ")){
                    await textOverlay(requestedUserData.namaLengkap, requestedUserData.nomorAnggota, requestedUserData.waktuValiditas);

                    // DISINI HARUSNYA NGIRIM KE CUSTOMER, BUKAN KE ADMIN
                    await sock.sendMessage(requestedUserNumberSend, {text: 'Selamat Kartu Anggota anda berhasil dibuat!' })
                    await sock.sendMessage(requestedUserNumberSend, { 
                        image: {
                            url:`output\\${requestedUserData.nomorAnggota}.png`
                        }
                    });

                    let file = `output\\${requestedUserData.nomorAnggota}.pdf`;
                    const mimeType = mime.lookup(file);
                    await sock.sendMessage(requestedUserNumberSend, {
						document: { url: file },
						caption: `Berikut kartu anggota ${requestedUserData.namaLengkap} dalam format PDF`, 
						fileName: path.basename(file), 
						mimetype: mimeType
					});

                    // Delay time to avoid spamming alert
                    setTimeout(async() => {
                        // send the image to ADMIN
                        await sock.sendMessage(NOMOR_ADMIN, { 
                            image: {
                                url:`output\\${requestedUserData.nomorAnggota}.png`
                            }
                        });
                    }, 5000);

                    // Delay time to avoid spamming alert
                    setTimeout(async() => {
                        // Thanks to Admin for validating users
                        await sock.sendMessage(NOMOR_ADMIN, {text: `Terima kasih! Kartu anggota digital akan segera dikirimkan ke nomor ${requestedUserData.namaLengkap}` })
                    }, 5000);
                }

                // IF NOT VALIDATE
                else if(responseButton?.selectedButtonId.includes("nomorTelfonNotValidate: ")){
                    // DISINI HARUSNYA NGIRIM KE CUSTOMER, BUKAN KE ADMIN
                    await sock.sendMessage(requestedUserNumberSend, {text: 'Sayang sekali pengajuan kartu anggota anda ditolak..\n\nSilakan hubungi admin berikut untuk konfirmasi segera' })

                    // Delay time to avoid spamming alert
                    setTimeout(async() => {
                        // Thanks to Admin for validating users
                        await sock.sendMessage(NOMOR_ADMIN, {text: `Terima kasih! Penolakan pembuatan kartu anggota akan diberitahukan ke nomor ${requestedUserData.namaLengkap}` })
                    }, 5000);
                }

            } else {
                await sock.sendMessage(msg.key.remoteJid!, {text: "Halo, Selamat Datang di WhatsApp Bot Membership Card Auto-Generated. \n\nTerima kasih telah menghubungi kontak admin kami!\nSilakan tulis isian di bawah ini!\n\nNama Lengkap:\nNomor Anggota:\nWaktu Validitas:\n\nContoh:\nNama Lengkap: Dimas Wisnu\nNomor Anggota: 201524005\nWaktu Validitas: 10/12/2002"});
                
                await exportCollectionAndStorageToExcel('Users', 'output/excel/data.xlsx', 'memberPhoto/')
            }
        } 
    })
}

// Function to get all users data (namaLengkap, nomorAnggota, waktuValiditas) from whatsappNumber
async function getUserDataFromWhatsappNumber(nomorTelfon) {
    const usersRef = collection(db, 'Users');
    const querySnapshot = await getDocs(query(usersRef, where('nomorTelfon', '==', nomorTelfon)));
    if (querySnapshot.empty) {
        // throw new Error(`No user found with whatsappNumber ${nomorTelfon}`);
        return null;
    }
    const userDoc = querySnapshot.docs[0];
    const userData = await userDoc.data();

    return userData;
}

/***************************************************
*** ./helpers/textOverlayImage.ts
*** Generate card from input users using JIMP
***************************************************/
async function textOverlay(namaLengkap, nomorAnggota, waktuValiditas) {
    // Call Overlay Text in Image Function in helpres folder
    const image = await Jimp.read('assets/image/mc_polosan.png');

    // Defining the text font
    const poppins_bold1 = await Jimp.loadFont('assets/font/fnt/poppins-bold.fnt');
    image.print(poppins_bold1, 906.8, 1507, namaLengkap);

    const poppins_semibold_italic = await Jimp.loadFont('assets/font/fnt/poppins-semibold-italic.fnt');
    image.print(poppins_semibold_italic, 1079, 1638, nomorAnggota);

    const poppins_bold2 = await Jimp.loadFont('assets/font/fnt/poppins-bold1.fnt');
    image.print(poppins_bold2, 198, 1053, waktuValiditas);

    // masking image with shape background
    let member_photo = await Jimp.read(`uploads\\pasfoto\\${nomorAnggota}.png`);
    member_photo = member_photo.resize(579.9, 745.9);
    member_photo = await member_photo;

    // Writing member photo in Firebase Storage
    const storageMemberPhotoRef = ref(storage, `memberPhoto/${nomorAnggota}.png`);
    const memberPhotoBuffer = await readFile(`uploads\\pasfoto\\${nomorAnggota}.png`);
    await uploadBytes(storageMemberPhotoRef, memberPhotoBuffer);
    // console.log("Member Photo uploaded successfully");

    const mask = await Jimp.read('assets/image/mask.png');

    let masked = member_photo.mask(mask, 0, 0);
    masked = await masked;

    image.composite(masked, 195.8, 1255)

    // Writing image after processing
    await image.writeAsync(`output\\${nomorAnggota}.png`);
    convertPNGtoPDF(`output\\${nomorAnggota}.png`, `output\\${nomorAnggota}.pdf`);

    // Writing Membership Card image in Firebase Storage
    const storageMembershipCardRef = ref(storage, `membershipCard/${nomorAnggota}.png`);
    const membershipCardBuffer = await readFile(`output\\${nomorAnggota}.png`);
    await uploadBytes(storageMembershipCardRef, membershipCardBuffer);
    // console.log("Membership Card uploaded successfully");
}

async function convertPNGtoPDF(pngFilePath: string, pdfFilePath: string) {
    // Read PNG file data
    const pngFileData = await readFile(pngFilePath);

     // Load the PNG image data into a PDF document
    const pdfDoc = await PDFDocument.create();
    const pngImage = await pdfDoc.embedPng(pngFileData);

    // Create a new page and add the PNG image as a full-page annotation
    const page = pdfDoc.addPage();
    const { width, height } = pngImage.scale(1);
    
    // Set the PDF page size to match the PNG image size
    page.setSize(width, height); 

    page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: width,
        height: height,
    });

    // Save the PDF file
    const pdfBytes = await pdfDoc.save();
    await writeFile(pdfFilePath, pdfBytes);
}

async function exportCollectionAndStorageToExcel(collectionName: string, filePath: string, storagePath: string,) {
    // Get all documents from the collection
    const querySnapshot = await getDocs(collection(db, collectionName));

    // Convert documents to an array of objects
    const data = querySnapshot.docs.map((doc) => doc.data());

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();

    // Add the first worksheet for the document data
    const worksheet = workbook.addWorksheet(collectionName);
    worksheet.columns = Object.keys(data[0]).map((key) => ({
        header: key,
        key: key,
        width: 20,
    }));
    worksheet.addRows(data);

    // Initialize Firebase Storage
    const storage = getStorage();

    // Add a new worksheet for the image URLs
    const imageSheet = workbook.addWorksheet('Images');
    imageSheet.columns = [    { header: 'Name', key: 'name', width: 30 },    { header: 'URL', key: 'url', width: 100 },];

    // List all the files in the storagePath folder
    const folderRef = ref(storage, storagePath);
    const files = await listAll(folderRef);

    // Download each file and store its download URL
    const urls = await Promise.all(
        files.items.map(async (fileRef) => {
            const downloadUrl = await getDownloadURL(fileRef);
            return { name: fileRef.name, url: downloadUrl };
        })
    );

    // Write image URLs to the worksheet
    urls.forEach((url) => {
        imageSheet.addRow(url);
    });

    // Save the workbook to a file
    const buffer = await workbook.xlsx.writeBuffer();
    await writeFile(filePath, new Uint8Array(buffer));
}


// run in main file
connectToWhatsApp()