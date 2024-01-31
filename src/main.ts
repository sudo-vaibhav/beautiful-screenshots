import { run } from "@backroad/backroad";
import Jimp from "jimp";
import sharp from "sharp";
type Asset = Awaited<ReturnType<typeof Jimp.read>>;
class Point {
  constructor(public x: number, public y: number) {}
  public toString() {
    return `${this.x},${this.y}`;
  }
  static from(point: Point) {
    return new Point(point.x, point.y);
  }
  equals(other: Point) {
    return this.x === other.x && this.y === other.y;
  }
  applyDiff(diff: Point) {
    return new Point(diff.x + this.x, diff.y + this.y);
  }
  liesInside(asset: Asset) {
    return (
      0 <= this.x &&
      this.x < asset.bitmap.width &&
      0 <= this.y &&
      this.y < asset.bitmap.height
    );
  }
}

function calculateScaledDimensions(
  width: number,
  height: number,
  scaleFactor: number
) {
  // const scaleFactor = 0.1;
  const newWidth = width * scaleFactor; // + width * scaleFactor;
  const newHeight = height * scaleFactor; // + height * scaleFactor;
  return { width: newWidth, height: newHeight };
}

const placeAssetInCenter = (boundingAsset: Asset, assetToBePlaced: Asset) => {
  const xPosition =
    (boundingAsset.bitmap.width - assetToBePlaced.bitmap.width) / 2;
  const yPosition =
    (boundingAsset.bitmap.height - assetToBePlaced.bitmap.height) / 2;
  boundingAsset.blit(assetToBePlaced, xPosition, yPosition);
};

type SharpAsset = ReturnType<typeof sharp>;

const placeAssetInCenterSharp = (
  boundingAsset: SharpAsset,
  assetToBePlaced: SharpAsset
) => {};
const moveAndCompare = (
  asset: Asset,
  startPoint: Point,
  diff: Point,
  endPoint: Point,
  comparisonDirection: Point,
  targetColor: number
) => {
  let pointIterator = Point.from(startPoint);
  const natureOfReturn =
    comparisonDirection.x + comparisonDirection.y < 0 ? "maximum" : "minimum";
  const pointBeingChecked = comparisonDirection.x === 0 ? "y" : "x";
  let answer = 100000000000000000000 * (natureOfReturn === "maximum" ? -1 : 1);

  while (!pointIterator.equals(endPoint)) {
    const newPointIterator = pointIterator.applyDiff(diff);
    let orthogonalIterator = Point.from(newPointIterator);
    while (
      orthogonalIterator.liesInside(asset) &&
      asset.getPixelColor(orthogonalIterator.x, orthogonalIterator.y) ===
        targetColor
    ) {
      orthogonalIterator = orthogonalIterator.applyDiff(comparisonDirection);
      // console.log(orthogonalIterator.toString());
    }
    if (
      orthogonalIterator.liesInside(asset) &&
      // orthogonalIterator[pointBeingChecked]
      asset.getPixelColor(orthogonalIterator.x, orthogonalIterator.y) !=
        targetColor
    ) {
      answer = (natureOfReturn === "maximum" ? Math.max : Math.min)(
        orthogonalIterator[pointBeingChecked],
        answer
      );
    }
    pointIterator = newPointIterator;
    // console.log(pointIterator.toString());
  }
  return answer;
};
const closestDifferentPixel = (
  asset: Asset,
  startPoint: Point,
  targetColor: number
) => {
  const q = [startPoint];
  const moves = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
  ];

  const seen = new Set<string>();
  seen.add(startPoint.toString());
  while (q.length) {
    const cur = q.shift();
    console.log(q.length);
    for (const [dx, dy] of moves) {
      const newPoint = new Point(cur.x + dx, cur.y + dy);
      if (
        0 <= newPoint.x &&
        newPoint.x < asset.bitmap.width &&
        0 <= newPoint.y &&
        newPoint.y < asset.bitmap.height &&
        !seen.has(newPoint.toString())
      ) {
        if (asset.getPixelColor(newPoint.x, newPoint.y) != targetColor) {
          return newPoint;
        }
        seen.add(newPoint.toString());
        q.push(newPoint);
      }
    }
    // moves.forEach(([dx, dy]) => {
    // });
  }
};

// function findLargestBoundingBox(image: Asset, targetColor: number) {
//   const width = image.bitmap.width;
//   const height = image.bitmap.height;

//   let top = height;
//   let left = width;
//   let right = 0;
//   let bottom = 0;

//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       image.getPixelColor(x, y) == targetColor;
//       // const color = image.getPixelColor(x, y);

//       // if (color === targetColor) {
//       //   top = Math.min(top, y);
//       //   left = Math.min(left, x);
//       //   right = Math.max(right, x);
//       //   bottom = Math.max(bottom, y);
//       // }
//     }
//   }

//   const boundingBoxWidth = right - left;
//   const boundingBoxHeight = bottom - top;

//   return {
//     top,
//     left,
//     right,
//     bottom,
//     width: boundingBoxWidth,
//     height: boundingBoxHeight,
//   };
// }

run(
  async (br) => {
    const [image] = br.fileUpload({
      label: "Choose screenshot",
    });

    br.write({
      body: "NOTE: this tool will always try to center screenshot based on background color detection",
    });
    // const balance = br.toggle({
    //   label: "Balance Image",
    // });

    const padding = br.radio({
      label: "Padding",
      options: ["0%", "10%", "20%", "40%"],
      defaultValue: "10%",
    });
    const addBg = br.toggle({ defaultValue: true, label: "Add Background" });
    const paddingScale = { "10%": 0.1, "0%": 0, "20%": 0.2, "40%": 0.4 }[
      padding
    ];
    if (image) {
      const asset = await Jimp.read(image.filepath);
      const targetColor = asset.getPixelColor(0, 0);
      const leftExtreme = moveAndCompare(
        asset,
        new Point(0, 0),
        new Point(0, 1),
        new Point(0, asset.bitmap.height - 1),
        new Point(1, 0),
        targetColor
      );

      const rightExtreme = moveAndCompare(
        asset,
        new Point(asset.bitmap.width - 1, 0),
        new Point(0, 1),
        new Point(asset.bitmap.width - 1, asset.bitmap.height - 1),
        new Point(-1, 0),
        targetColor
      );

      const topExtreme = moveAndCompare(
        asset,
        new Point(0, 0),
        new Point(1, 0),
        new Point(asset.bitmap.width - 1, 0),
        new Point(0, 1),
        targetColor
      );

      const bottomExtreme = moveAndCompare(
        asset,
        new Point(0, asset.bitmap.height - 1),
        new Point(1, 0),
        new Point(asset.bitmap.width - 1, asset.bitmap.height - 1),
        new Point(0, -1),
        targetColor
      );

      asset.crop(
        leftExtreme,
        topExtreme,
        rightExtreme - leftExtreme,
        bottomExtreme - topExtreme
      );
      const newDimensions = {
        width: asset.bitmap.width * (1 + paddingScale),
        height: asset.bitmap.height * (1 + paddingScale),
      };

      // mask.roun(20);
      const paddedAsset = await new Jimp(
        newDimensions.width,
        newDimensions.height,
        targetColor
      );
      // paddedAsset
      placeAssetInCenter(paddedAsset, asset);
      br.write({
        body: `## Output`,
      });
      const paddedAssetBuffer = await paddedAsset.getBufferAsync(Jimp.MIME_PNG);
      // sharp
      const roundedAsset = sharp(paddedAssetBuffer)
        .composite([
          {
            input: Buffer.from(
              `<svg><rect x="0" y="0" width="${
                paddedAsset.bitmap.width
              }" height="${
                paddedAsset.bitmap.height
              }" rx="${20}" ry="${20}" /></svg>`
            ),
            blend: "dest-in",
          },
        ])
        .png();

      // const paddedAssetBase64 = await sharpToBase64(roundedAsset);

      // paddedAsset.getBase64(Jimp.AUTO, (e, res) => {
      //   // br.write({ body: res });
      //   br.image({ src: res });
      // });

      // br.write({ body: paddedAssetBase64 });
      // br.image({ src: paddedAssetBase64 });
      let finalAsset: sharp.Sharp;
      if (!addBg) {
        finalAsset = roundedAsset;
      } else {
        const backgroundAssetSize = {
          width: Math.round(newDimensions.width * (1 + paddingScale)),
          height: Math.round(newDimensions.height * (1 + paddingScale)),
        };
        const x = Math.round(
          (backgroundAssetSize.width - (await roundedAsset.metadata()).width) /
            2
        );
        const y = Math.round(
          (backgroundAssetSize.height -
            (await roundedAsset.metadata()).height) /
            2
        );

        finalAsset = sharp("./background.png")
          .resize({
            width: backgroundAssetSize.width,
            height: backgroundAssetSize.height,
            position: "center",
          })
          .composite([
            {
              input: await roundedAsset.toBuffer(),
              left: x,
              top: y,
            },
          ]);
      }

      // = sharp("./background.png");
      // const roundedImageMetadata = await roundedAsset.metadata();

      const [col1, col2] = br.columns({ columns: 2 });

      col1.image({ src: await sharpToBase64(finalAsset) });

      col2.image({
        src: await asset.getBase64Async(Jimp.AUTO),
      });
    }
  },
  { server: { port: process.env.PORT ? parseInt(process.env.PORT) : 3333 } }
);

const sharpToBase64 = async (asset: SharpAsset) => {
  return `data:image/png;base64,${(await asset.toBuffer()).toString("base64")}`;
};
