import Jimp from "jimp";
import { PDFDocument } from 'pdf-lib';
import { writeFile, readFile } from 'fs/promises'

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
    // const storageMemberPhotoRef = ref(storage, `memberPhoto/${nomorAnggota}.png`);
    // const memberPhotoBuffer = await readFile(`uploads\\pasfoto\\${nomorAnggota}.png`);
    // await uploadBytes(storageMemberPhotoRef, memberPhotoBuffer);
    // console.log("Member Photo uploaded successfully");

    const mask = await Jimp.read('assets/image/mask.png');

    let masked = member_photo.mask(mask, 0, 0);
    masked = await masked;

    kd.composite(masked, 195.8, 1255)

    // Writing image after processing
    await kd.writeAsync(`${nomorAnggota}.png`);
    convertPNGtoPDF(`${nomorAnggota}.png`, `${nomorAnggota}.pdf`);

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

textOverlay('Azhar Alauddin', '201524015', '20/13/2023')