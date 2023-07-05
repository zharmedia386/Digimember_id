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
    apiKey: "AIzaSyBWOqUYZDc8ehFPUFS8p1JbABc_rts26lE",
    authDomain: "ppi-jabar.firebaseapp.com",
    projectId: "ppi-jabar",
    storageBucket: "ppi-jabar.appspot.com",
    messagingSenderId: "771885703085",
    appId: "1:771885703085:web:ffa8cc1b0702f86d3f8b24"
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

        // Determine whether the message is a personal or group message
        let currentMessage = msg.message?.extendedTextMessage?.text ? msg.message?.extendedTextMessage?.text : msg.message!.conversation;

        let status = '';
        let nomorAnggota = '';
        let noKTP = '';

        let nomorAnggotaFromFirebase = '';
        let noKTPFromFirebase = '';

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
            if(currentMessage.includes('Yakin')){
                setTimeout(async() => {
                    try {
                        await sock.sendMessage(msg.key.remoteJid!, {text: `Anda dapat memilih salah satu pilihan di bawah ini:\n\n*Ketik*\n\n1️⃣ Mengisi Data\n2️⃣ Mencetak Kembali` })
                    } catch (error) {
                        console.error('Error sending message:', error);
                    }
                }, 5000);

                status = 'boarding';

                // if user document in firebase is found with the current user's nomorTelfon
                if(userData) {
                    nomorAnggotaFromFirebase = userData.nomorAnggota;
                    noKTPFromFirebase = userData.noKTP;
                }

                // Validate that one user should have one document in firebase with nomorTelfon constraints
                // if there is document with current nomorTelfon, then send message that user has already logged with document content
                // else, the user data will be stored in firebase 
                if (nomorAnggotaFromFirebase && noKTPFromFirebase) {
                    setTimeout(async() => {
                        try {
                            await sock.sendMessage(msg.key.remoteJid!, {text: `Anda sudah mendaftar akun sebelumnya dan masih tersimpan dalam database!\n\nBerikut datanya:\nNomor KTP: ${noKTP}\nNomor Anggota: ${nomorAnggota}\n\nApakah Anda mengetahui NRA anda?` })
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 5000);
                } else {
                    setTimeout(async() => {
                        try {
                            await sock.sendMessage(msg.key.remoteJid!, {text: "Terima kasih! Nama Lengkap, Nomor Anggota, dan Waktu Validitas sudah tersimpan..\n\nSilakan lampirkan pas foto 3x4 dalam bentuk gambar\nFormat JPEG, JPG, PNG" })
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 5000);
                }
            } else if (messageType === 'imageMessage' && status == 'registered') {
                if(parseInt(currentMessage) == 1) {
                    setTimeout(async() => {
                        try {
                            await sock.sendMessage(msg.key.remoteJid!, 
                                {text: `Mohon siapkan hal-hal berikut untuk mengisi data:\n1️⃣ Nomor KTP\n2️⃣ NRA\n\nJika sudah siap, Silakan ketik *Siap* untuk melanjutkan` })
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 5000);
                } else if(parseInt(currentMessage) == 2) {
                    setTimeout(async() => {
                        try {
                            await sock.sendMessage(msg.key.remoteJid!, {text: `Mohon siapkan hal-hal berikut untuk mengisi data:\n1️⃣ Nomor KTP\n2️⃣ NRA\n 3️⃣ Jabatan\n(Pengurus Pusat/Pengurus Provinsi/Pengurus KabupatenKota/Anggota Biasa/Anggota Kehormatan/Generasi Muda PPI)\n\nJika sudah siap, Silakan ketik *Siap* untuk melanjutkan` })
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 5000);
                }

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

                setTimeout(async() => {
                    try {
                        await sock.sendMessage(msg.key.remoteJid!, {text: "Terima kasih! Pas foto anda sudah tersimpan..\n\n1 Langkah terakhir..Silakan lampirkan bukti pembayaran dalam bentuk gambar\nFormat JPEG, JPG, PNG" })
                    } catch (error) {
                        console.error('Error sending message:', error);
                    }
                }, 5000);

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

                setTimeout(async() => {
                    try {
                        await sock.sendMessage(msg.key.remoteJid!, {text: "Foto Bukti Transfer anda sudah tersimpan..\n\nSilakan tunggu beberapa waktu untuk menunggu konfirmasi dari Admin Setempat" })
                    } catch (error) {
                        console.error('Error sending message:', error);
                    }
                }, 4000);

                ///////////////////////////////////
                //// SEND CONFIRMATION TO ADMIN
                //// Delay time to avoid spamming alert
                ///////////////////////////////////

                // send pasfoto image from Firebase storage
                setTimeout(async() => {
                    try {
                        await sock.sendMessage(NOMOR_ADMIN, { 
                            image: {
                                url:`uploads\\pasfoto\\${userData.nomorAnggota}.png`
                            }
                        });
                    } catch (error) {
                        console.error('Error sending message:', error);
                    }
                }, 4000);

                // send bukti transfer image from Firebase storage
                setTimeout(async() => {
                    try {
                        await sock.sendMessage(NOMOR_ADMIN, { 
                            image: {
                                url:`uploads\\buktiTransfer\\${userData.nomorAnggota}.png`
                            }
                        });
                    } catch (error) {
                        console.error('Error sending message:', error);
                    }
                }, 6000);
                
                // Validation Buttons
                const textMessage = `${userData.namaLengkap} melakukan registrasi berikut data, pas foto, dan bukti transfernya:\n\nNama Lengkap: ${userData.namaLengkap}\nNomor Anggota: ${userData.nomorAnggota}\nWaktu Validitas: ${userData.waktuValiditas}\n\nSetujui pembuatan kartu anggota dengan data tersebut? \n\nKetikkan "${userData.nomorTelfon} YA" untuk menyutujui\nKetikkan "${userData.nomorTelfon} TIDAK" untuk menolak`
                
                setTimeout(async() => {
                    try {
                        await sock.sendMessage(NOMOR_ADMIN, {text: textMessage});
                    } catch (error) {
                        console.error('Error sending message:', error);
                    }
                }, 8000);
    
            } else if (((status === 'validated') || role === 'admin')) {
                status = 'registered';

                let requestedUserNumber = currentMessage
                requestedUserNumber = requestedUserNumber.replace(/\s/g, '').replace('YA','').replace('TIDAK','');
                console.log('NUMBER',requestedUserNumber)
                
                let requestedUserNumberSend;
                
                // Remove any non-digit characters from the number
                const cleanedNumber = requestedUserNumber.replace(/\D/g, '');
                const regex = /^62\d{10,12}$/;
                if(regex.test(requestedUserNumber)) {
                    requestedUserNumberSend = requestedUserNumber + "@s.whatsapp.net";
                } else {
                    requestedUserNumberSend = requestedUserNumber + "@g.us";
                }
                
                // Retrieve data from firebase based on Requested User WhatsApp Number
                let requestedUserData = await getUserDataFromWhatsappNumber(requestedUserNumber)
                console.log('DATA USER',requestedUserData)

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
                if(currentMessage.includes('YA')){
                    await textOverlay(requestedUserData.namaLengkap, requestedUserData.nomorAnggota, requestedUserData.waktuValiditas);

                    console.log("SEND NUMBER",requestedUserNumberSend)

                    // DISINI HARUSNYA NGIRIM KE CUSTOMER, BUKAN KE ADMIN
                    setTimeout(async() => {
                        try {
                            await sock.sendMessage(requestedUserNumberSend, {text: 'Selamat Kartu Anggota anda berhasil dibuat!' })
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 4000);

                    setTimeout(async() => {
                        try {
                            await sock.sendMessage(requestedUserNumberSend, { 
                                image: {
                                    url:`output\\${requestedUserData.nomorAnggota}.png`
                                }
                            });
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 5000);
                    

                    let file = `output\\${requestedUserData.nomorAnggota}.pdf`;
                    const mimeType = mime.lookup(file);
                    setTimeout(async() => {
                        try {
                            await sock.sendMessage(requestedUserNumberSend, {
                                document: { url: file },
                                caption: `Berikut kartu anggota ${requestedUserData.namaLengkap} dalam format PDF`, 
                                fileName: path.basename(file), 
                                mimetype: mimeType
                            });
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 6000);

                    // Delay time to avoid spamming alert
                    setTimeout(async() => {
                        try {
                            // send the image to ADMIN
                            await sock.sendMessage(NOMOR_ADMIN, { 
                                image: {
                                    url:`output\\${requestedUserData.nomorAnggota}.png`
                                }
                            });
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 7000);

                    // Delay time to avoid spamming alert
                    setTimeout(async() => {
                        try {
                            // Thanks to Admin for validating users
                            await sock.sendMessage(NOMOR_ADMIN, {text: `Terima kasih! Kartu anggota digital akan segera dikirimkan ke nomor ${requestedUserData.namaLengkap}` })
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 8000);
                }

                // IF NOT VALIDATE
                else if(currentMessage.includes('TIDAK')){
                    // DISINI HARUSNYA NGIRIM KE CUSTOMER, BUKAN KE ADMIN
                    setTimeout(async() => {
                        try {
                            await sock.sendMessage(requestedUserNumberSend, {text: 'Sayang sekali pengajuan kartu anggota anda ditolak..\n\nSilakan hubungi admin berikut untuk konfirmasi segera' })
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 5000);

                    // Delay time to avoid spamming alert
                    setTimeout(async() => {
                        try {
                            // Thanks to Admin for validating users
                            await sock.sendMessage(NOMOR_ADMIN, {text: `Terima kasih! Penolakan pembuatan kartu anggota akan diberitahukan ke nomor ${requestedUserData.namaLengkap}` })
                        } catch (error) {
                            console.error('Error sending message:', error);
                        }
                    }, 7000);
                }

            } else {
                setTimeout(async() => {
                    try {
                        await sock.sendMessage(msg.key.remoteJid!, {text: "Halo, Selamat Datang di WhatsApp Bot Pembuatan KPA PPI Jabar. \n\nApakah anda yakin untuk melanjutkan proses pembuatan KPA?\nKetik *Yakin* untuk melanjutkan\n\nTutorial Cara Pakai Chatbot:\nLink"});
                    } catch (error) {
                        console.error('Error sending message:', error);
                    }
                }, 5000);
                
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
    const kd = await Jimp.read('assets/image/mc_polosan.png');
    const kb = await Jimp.read('assets/image/kb.png');

    // Defining the text font
    const poppins_bold1 = await Jimp.loadFont('assets/font/fnt/poppins-bold.fnt');
    kd.print(poppins_bold1, 906.8, 1507, namaLengkap);

    const poppins_semibold_italic = await Jimp.loadFont('assets/font/fnt/poppins-semibold-italic.fnt');
    kd.print(poppins_semibold_italic, 1079, 1638, nomorAnggota);

    const poppins_bold2 = await Jimp.loadFont('assets/font/fnt/poppins-bold1.fnt');
    kd.print(poppins_bold2, 198, 1053, waktuValiditas);

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

    kd.composite(masked, 195.8, 1255)

    // Writing image after processing
    await kd.writeAsync(`output\\${nomorAnggota}.png`);
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