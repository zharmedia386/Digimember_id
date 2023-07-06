import Jimp from "jimp";
import { PDFDocument } from 'pdf-lib';
import { writeFile, readFile } from 'fs/promises'

async function textOverlay(namaLengkap, nomorAnggota) {
    let nomorAnggota_print = "NRA. " + nomorAnggota
    let namaLengkap_print = namaLengkap.toUpperCase();

    // Call Overlay Text in Image Function in helpres folder
    const quality = 100; // Set the desired quality value (0-100)
    let kd = await Jimp.read('assets/image/kd_anggota_biasa_1.png');

    let kb = await Jimp.read('assets/image/kb_1.png');

    // Defining the text font
    const time_new_roman_bold = await Jimp.loadFont('assets/font/fnt/time_new_roman_bold_1.fnt');

    // Calculate text width
    const namaLengkapWidth = Jimp.measureText(time_new_roman_bold, namaLengkap_print);
    const nomorAnggotaWidth = Jimp.measureText(time_new_roman_bold, nomorAnggota_print);

    // Calculate center position for namaLengkap
    const namaLengkapX = Math.floor((kd.getWidth() - namaLengkapWidth) / 2);
    const namaLengkapY = 1056; // Fixed y-coordinate for namaLengkap

    // Calculate center position for nomorAnggota
    const nomorAnggotaX = Math.floor((kd.getWidth() - nomorAnggotaWidth) / 2);
    const nomorAnggotaY = 1111; // Fixed y-coordinate for nomorAnggota

    // Print text in the center
    kd.print(time_new_roman_bold, namaLengkapX, namaLengkapY, namaLengkap_print);
    kd.print(time_new_roman_bold, nomorAnggotaX, nomorAnggotaY, nomorAnggota_print);
    
    // masking image with shape background
    let member_photo = await Jimp.read(`uploads\\pasfoto\\${nomorAnggota}.png`);
    member_photo = member_photo.resize(516, 540);
    member_photo = await member_photo;
    kd.composite(member_photo, 152, 511)

    // masking image with shape rectangle
    let rectangle = await Jimp.read(`assets/image/rectangle.png`);
    rectangle = rectangle.resize(580, 3.24);
    rectangle = await rectangle;
    kd.composite(rectangle, 120, 1107)

    // Writing member photo in Firebase Storage
    // const storageMemberPhotoRef = ref(storage, `memberPhoto/${nomorAnggota}.png`);
    // const memberPhotoBuffer = await readFile(`uploads\\pasfoto\\${nomorAnggota}.png`);
    // await uploadBytes(storageMemberPhotoRef, memberPhotoBuffer);
    // console.log("Member Photo uploaded successfully");

    // Writing image after processing
    await kd.quality(quality).writeAsync(`${nomorAnggota}_depan.png`);
    await kb.quality(quality).writeAsync(`${nomorAnggota}_belakang.png`);

    convertPNGtoPDF(`${nomorAnggota}_depan.png`, `${nomorAnggota}_depan.pdf`);
    convertPNGtoPDF(`${nomorAnggota}_belakang.png`, `${nomorAnggota}_belakang.pdf`);

    // Writing Membership Card image in Firebase Storage
    // const storageMembershipCardRef = ref(storage, `membershipCard/${nomorAnggota}.png`);
    // const membershipCardBuffer = await readFile(`output\\${nomorAnggota}.png`);
    // await uploadBytes(storageMembershipCardRef, membershipCardBuffer);
    // console.log("Membership Card uploaded successfully");
}

async function textOverlay_low_quality(namaLengkap, nomorAnggota) {
    let nomorAnggota_print = "NRA. " + nomorAnggota
    let namaLengkap_print = namaLengkap.toUpperCase();

    // Call Overlay Text in Image Function in helpres folder
    const quality = 100; // Set the desired quality value (0-100)
    let kd = await Jimp.read('assets/image/kd_anggota_biasa_1.png');
    // kd.resize(205, 325, Jimp.RESIZE_BICUBIC);

    let kb = await Jimp.read('assets/image/kb_1.png');
    // kb.resize(205, 325, Jimp.RESIZE_BICUBIC);

    // Defining the text font
    const time_new_roman_bold = await Jimp.loadFont('assets/font/fnt/time_new_roman_bold.fnt');

    // Calculate text width
    const namaLengkapWidth = Jimp.measureText(time_new_roman_bold, namaLengkap_print);
    const nomorAnggotaWidth = Jimp.measureText(time_new_roman_bold, nomorAnggota_print);

    // Calculate center position for namaLengkap
    const namaLengkapX = Math.floor((kd.getWidth() - namaLengkapWidth) / 2);
    const namaLengkapY = 266; // Fixed y-coordinate for namaLengkap

    // Calculate center position for nomorAnggota
    const nomorAnggotaX = Math.floor((kd.getWidth() - nomorAnggotaWidth) / 2);
    const nomorAnggotaY = 278; // Fixed y-coordinate for nomorAnggota

    // Print text in the center
    kd.print(time_new_roman_bold, namaLengkapX, namaLengkapY, namaLengkap_print);
    kd.print(time_new_roman_bold, nomorAnggotaX, nomorAnggotaY, nomorAnggota_print);
    
    // masking image with shape background
    let member_photo = await Jimp.read(`uploads\\pasfoto\\${nomorAnggota}.png`);
    member_photo = member_photo.resize(130, 136);
    member_photo = await member_photo;
    kd.composite(member_photo, 37, 127)

    // masking image with shape rectangle
    let rectangle = await Jimp.read(`assets/image/rectangle.png`);
    rectangle = rectangle.resize(146, 0.82);
    rectangle = await rectangle;
    kd.composite(rectangle, 29, 276.78)

    // Writing member photo in Firebase Storage
    // const storageMemberPhotoRef = ref(storage, `memberPhoto/${nomorAnggota}.png`);
    // const memberPhotoBuffer = await readFile(`uploads\\pasfoto\\${nomorAnggota}.png`);
    // await uploadBytes(storageMemberPhotoRef, memberPhotoBuffer);
    // console.log("Member Photo uploaded successfully");

    // Writing image after processing
    await kd.quality(quality).writeAsync(`${nomorAnggota}_depan.png`);
    await kb.quality(quality).writeAsync(`${nomorAnggota}_belakang.png`);

    convertPNGtoPDF(`${nomorAnggota}_depan.png`, `${nomorAnggota}_depan.pdf`);
    convertPNGtoPDF(`${nomorAnggota}_belakang.png`, `${nomorAnggota}_belakang.pdf`);

    // Writing Membership Card image in Firebase Storage
    // const storageMembershipCardRef = ref(storage, `membershipCard/${nomorAnggota}.png`);
    // const membershipCardBuffer = await readFile(`output\\${nomorAnggota}.png`);
    // await uploadBytes(storageMembershipCardRef, membershipCardBuffer);
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

textOverlay('Dimas Wisnu', '2018 0915 026')