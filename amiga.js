// From https://retrocomputing.stackexchange.com/questions/13897/why-was-the-kickstart-1-x-insert-floppy-graphic-so-bad
const data = "FF01230B3A0B3A217121710B7D0B8816885E7F5E7F3840383E36353634382D382D412348230BFE022545FF012148210A7E0A8A168A5F565F5664526C4E714A74447D3C813C8C0A8C0A6D096D09510D4B14451541193A1E37213621361E381A3A164115450E4B0A510A6C0B6D0B8B288B287630763472345F325C3252414541393E373B373E3A3E413D423642333F2A461E4C125512541E4B1A4A17471A491E4A2148FF01323D34363C373D3A3D413641323DFF01335C3352424542397D397D5E345E335AFF013C0B6F0B6F203C203C0BFF01600E6B0E6B1C601C600EFE033E1FFF01620F690F691B621B620FFE02631AFF012F393239323B2F3F2F39FF01298B2977307735723569396B416B416D457249724974437D3B803B8B298BFF01355F35643A61355FFF0139623564355F4A5F40693F6941673C623962FF014E5F555F5564516C4E7049714671436D436A4E5FFF01446A446D467048704C6F4D6C4969446AFF0136683E6A40673C63396336653668FF017E0B8916895EFE01220BFE013B0BFE01610FFE016A1BFE01700FFE017E5EFE014B60FE012E39FFFF"

function floodFill(x, y, targetColor, fillColor) {
    let stack = [
        [x, y]
    ];
    let visited = new Set();

    function getIndex(x, y) {
        return 4 * (x + y * width);
    }

    function colorMatch(i, color) {
        // I'm _still_ getting anti-aliasing, which means I need an (arbitrary)
        // range of colours to detect against.
        const delta = 20;
        return (
            Math.abs(pixels[i+0] - color[0]) < delta &&
            Math.abs(pixels[i+1] - color[1]) < delta &&
            Math.abs(pixels[i+2] - color[2]) < delta &&
            Math.abs(pixels[i+3] - color[3]) < delta
        );
    }

    while (stack.length) {
        let [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
        let key = cx + "," + cy;
        if (visited.has(key)) continue;
        visited.add(key);

        let i = getIndex(cx, cy);
        if (colorMatch(i, targetColor)) {
            pixels[i] = fillColor[0];
            pixels[i + 1] = fillColor[1];
            pixels[i + 2] = fillColor[2];
            pixels[i + 3] = fillColor[3];

            stack.push([cx + 1, cy]);
            stack.push([cx - 1, cy]);
            stack.push([cx, cy + 1]);
            stack.push([cx, cy - 1]);
        }
    }
}

let bytes;
const palette = ["#f0f0f0ff", "#000000ff", "#7070c0ff", "#b0b0b0ff"];
const bgColor = 0;

function rgbArray(idx) {
    return palette[idx].substr(1).match(/.{1,2}/g).map(byte => parseInt(byte, 16));
}


function setup() {
    bytes = data.match(/.{1,2}/g).map(byte => parseInt(byte, 16));

    canvas = createCanvas(320, 200, P2D);
    canvas.elt.style = "width:320px; height:200px;";
    canvas.elt.style.imageRendering = "pixelated";
    strokeWeight(1);
    noSmooth();

    // Force-disable all image smoothing
    let ctx = canvas.elt.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
};

function draw() {
    background(...rgbArray(bgColor));
    let fills = [];

    // Offset by .5, so that the stroke is central
    // (It's supposed to minimize the anti-aliasing)
    let cx = 70.5;
    let cy = 40.5;
    let px, py;

    let idx = 0;
    while (true) {
        // Read two bytes at a time.
        const byte1 = bytes[idx];
        const byte2 = bytes[idx + 1];

        idx += 2;

        // If both bytes are FF, end the program.
        if (byte1 === byte2 && byte1 === 0xff) {
            break;
        }

        // If the first byte is FF and the second byte is not, start drawing a polyline
        // with the color index given in the second byte.
        // Treat any subsequent two bytes as x,y coordinates belonging to that polyline except
        // if the first byte is FF (see rules 2 and 3) or FE (see rule 4), which is where you
        // stop drawing the line.
        if (byte1 === 0xff) {
            stroke(...rgbArray(byte2));
            noSmooth();
            //
            px = bytes[idx];
            py = bytes[idx + 1];
            idx += 2;
        }
        //

        // If the first byte is FE, flood fill an area using the color index given in the
        // second byte, starting from the point whose coordinates are given in the next two bytes.
        else if (byte1 === 0xfe) {
            const floodX = bytes[idx];
            const floodY = bytes[idx + 1];

            fills.push({
                x: Math.floor(floodX + cx),
                y: Math.floor(floodY + cy),
                colorIndex: byte2
            });

            idx += 2;
        }
        //
        else {
            line(cx + px, cy + py, cx + byte1, cy + byte2);
            px = byte1;
            py = byte2;
        }

    }
    
    // Fill stuff
    loadPixels();

    for (const fill of fills) {
        floodFill(fill.x, fill.y, rgbArray(bgColor), rgbArray(fill.colorIndex));
    }

    updatePixels();
    noLoop();
}

