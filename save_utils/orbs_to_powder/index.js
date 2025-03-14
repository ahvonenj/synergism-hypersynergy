import fs from "fs/promises";
import { parse, format } from 'date-fns';

const args = process.argv.slice(2);
const conversionRatio = args.length > 0 ? parseFloat(args[0]) : null;

if (conversionRatio === null) {
    console.error("Error: No conversion ratio provided.");
    console.error("Usage: node index.js <conversion_ratio>");
    process.exit(1);
} else if (isNaN(conversionRatio)) {
    console.error(`Error: Invalid conversion ratio '${args[0]}'. Please provide a number.`);
    console.error("Usage: node index.js <conversion_ratio>");
    process.exit(1);
} else {
    console.log(`Using conversion ratio: ${conversionRatio}`);
}

(async () => {
    try {
        const allFiles = await fs.readdir('./');
        
        if (allFiles.length === 0) {
            console.error("Error: No files found in the current directory.");
            return;
        }
        
        const saveFiles = allFiles.filter(file => {
            return (file.includes('.txt'))
        });
        
        if (saveFiles.length === 0) {
            console.error("Error: No .txt files found in the current directory.");
            return;
        }
        
        const fileObjects = saveFiles.map(fileName => {
            const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2} \d{2}_\d{2}_\d{2})/);
            let fileDate = null;
            
            if (dateMatch) {
                fileDate = parse(dateMatch[1], 'yyyy-MM-dd HH_mm_ss', new Date());
            }
            
            return {
                fileName,
                fileDate
            };
        });
        
        const validFiles = fileObjects.filter(file => file.fileDate !== null);
        
        if (validFiles.length === 0) {
            console.error("Error: No files with valid date format found.");
            return;
        }
        
        const sortedFiles = validFiles.sort((a, b) => {
            return b.fileDate - a.fileDate;
        });
        
        const newestSaveFile = sortedFiles[0];
        console.log(`Found newest save file: ${newestSaveFile.fileName}`);
        const fileContent = await fs.readFile(`./${newestSaveFile.fileName}`, 'utf8');
        
        try {
            const decodedContent = Buffer.from(fileContent, 'base64').toString('utf8');

            console.log("Successfully decoded the save file content!");

			let saveData;

            try {
                saveData = JSON.parse(decodedContent);
            } catch (jsonError) {
                console.log("Note: Decoded content is not valid JSON.");
            }

			const editedSaveData = convertOrbsToPowder(saveData);

			if (editedSaveData === false) {
				console.error("Error: Save file does not contain required fields (overfluxOrbs or overfluxPowder).");
				return;
			}
			
			const editedJsonString = JSON.stringify(editedSaveData);
			const encodedSaveData = Buffer.from(editedJsonString).toString('base64');
			const now = new Date();
			const timestamp = format(now, 'yyyy-MM-dd HH_mm_ss');
			const newFilename = `converted_save_${timestamp}.txt`;
			
			await fs.writeFile(newFilename, encodedSaveData);
			console.log(`Successfully saved converted data to ${newFilename}`);
        } catch (decodeError) {
            console.error("Error: Failed to decode the file content as base64.");
            console.error(decodeError);
            return;
        }
    } catch (error) {
        console.error("An unexpected error occurred:");
        console.error(error);
    }
})();

const convertOrbsToPowder = (saveData) => {
	if(!('overfluxOrbs' in saveData)) return false;
	if(!('overfluxPowder' in saveData)) return false;

	const currentOrbs = saveData.overfluxOrbs;
	const currentPowder = saveData.overfluxPowder;
	const newOrbs = 0;
	const newPowder = (currentOrbs / conversionRatio) + currentPowder;

	saveData.overfluxOrbs = newOrbs;
	saveData.overfluxPowder = newPowder;

	console.log(`(currentOrbs / conversionRatio) + currentPowder = (${currentOrbs} / ${conversionRatio}) + ${currentPowder} = ${newPowder}`)

	return saveData;
}