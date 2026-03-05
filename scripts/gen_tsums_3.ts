import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import { writeFile, readFileSync } from 'fs';

function saveBinaryFile(fileName: string, content: Buffer) {
  writeFile(fileName, content, 'utf8', (err) => {
    if (err) console.error(`Error writing file ${fileName}:`, err);
    else console.log(`File ${fileName} saved to file system.`);
  });
}

async function generate(promptText: string, imagePath: string | null, outPrefix: string) {
  const ai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] });
  const config = {
    imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
    responseModalities: ['IMAGE'],
  };
  const parts: any[] = [{ text: promptText }];
  if (imagePath) {
    try {
      const data = readFileSync(imagePath).toString('base64');
      parts.unshift({
        inlineData: {
          data,
          mimeType: mime.getType(imagePath) || 'image/png'
        }
      });
    } catch(e) {
      console.error(`Skipping image ${imagePath} - not found or error`, e);
    }
  }

  const contents = [{ role: 'user', parts }];
  console.log(`Generating for ${outPrefix}...`);
  try {
    const response = await ai.models.generateContentStream({ model: 'gemini-3-pro-image-preview', config, contents });
    
    let fileIndex = 0;
    for await (const chunk of response) {
      if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        const fileName = `${outPrefix}_${fileIndex++}`;
        const inlineData = chunk.candidates[0].content.parts[0].inlineData;
        const fileExtension = mime.getExtension(inlineData.mimeType || '');
        const buffer = Buffer.from(inlineData.data || '', 'base64');
        saveBinaryFile(`${fileName}.${fileExtension}`, buffer);
      } else if (chunk.text) {
        console.log(chunk.text);
      }
    }
  } catch (e) {
    console.error(`Error generating for ${outPrefix}:`, e);
  }
}

async function main() {
  const basePrompt = "この画像を元に、ディズニーの「ツムツム」のような、3D処理された丸っこい球体っぽくてかわいいキャラクターの画像を生成してください。背景は白っぽくしてください。";
  await generate(basePrompt, "public/assets/3.png", "public/assets/tsum_3");
}

main().catch(console.error);
