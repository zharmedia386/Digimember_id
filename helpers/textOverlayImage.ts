import Jimp from "jimp";

export async function textOverlay(plainCard: string, fullname: string, memberId: string, validThru: string, memberPhoto: string, maskImage: string) {
    // Reading image
    const image = await Jimp.read(plainCard);

    // Defining the text font
    const poppins_bold1 = await Jimp.loadFont('assets/font/fnt/poppins-bold.fnt');
    image.print(poppins_bold1, 906.8, 1507, fullname);

    const poppins_semibold_italic = await Jimp.loadFont('assets/font/fnt/poppins-semibold-italic.fnt');
    image.print(poppins_semibold_italic, 1079, 1638, memberId);

    const poppins_bold2 = await Jimp.loadFont('assets/font/fnt/poppins-bold1.fnt');
    image.print(poppins_bold2, 198, 1053, validThru);

    // masking image with shape background
    let member_photo = await Jimp.read(memberPhoto);
    member_photo = member_photo.resize(579.9, 745.9);
    member_photo = await member_photo;

    const mask = await Jimp.read(maskImage);

    let masked = member_photo.mask(mask, 0, 0);
    masked = await masked;

    image.composite(masked, 195.8, 1255)

    // Writing image after processing
    await image.writeAsync('2015240132.png');
}

// console.log("Image is processed succesfully");

/*
REFERENSI:
https://github.com/jimp-dev/jimp/issues/69
https://github.com/jimp-dev/jimp/issues/369
https://ttf2fnt.com/
https://www.section.io/engineering-education/jimp-image-processing/
https://blog.logrocket.com/image-processing-with-node-and-jimp/
https://www.tutorialspoint.com/how-to-overlay-an-image-over-another-in-node-jimp
*/