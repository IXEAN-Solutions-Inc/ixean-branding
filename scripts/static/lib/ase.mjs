// Adobe Swatch Exchange (ASE) writer and reader.
// Layout: "ASEF", version 1.0 (u16 + u16), block count (u32), then blocks of
// type (u16), length (u32), body. Colour body: name length in UTF-16 units
// including the terminator (u16), UTF-16BE name + NUL, model "RGB ", three
// big-endian float32 channels in 0-1, colour type (u16; 2 = normal).
const SIGNATURE = 'ASEF';
const VERSION_MAJOR = 1;
const VERSION_MINOR = 0;
const BLOCK_COLOR = 0x0001;
const BLOCK_GROUP_START = 0xc001;
const BLOCK_GROUP_END = 0xc002;
const MODEL_RGB = 'RGB ';
const COLOR_TYPE_NORMAL = 2;

const u16 = (value) => {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
};
const u32 = (value) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
};
const f32 = (value) => {
  const buffer = Buffer.alloc(4);
  buffer.writeFloatBE(value);
  return buffer;
};

function name(text) {
  const units = Buffer.alloc((text.length + 1) * 2);
  for (let i = 0; i < text.length; i += 1) units.writeUInt16BE(text.charCodeAt(i), i * 2);
  return Buffer.concat([u16(text.length + 1), units]);
}

const block = (type, body) => Buffer.concat([u16(type), u32(body.length), body]);

const hexToRgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));

// colors: [{ name, hex }] written inside one named group.
export function writeAse(groupName, colors) {
  const blocks = [
    block(BLOCK_GROUP_START, name(groupName)),
    ...colors.map(({ name: label, hex }) =>
      block(
        BLOCK_COLOR,
        Buffer.concat([
          name(label),
          Buffer.from(MODEL_RGB, 'ascii'),
          ...hexToRgb(hex).map((channel) => f32(channel / 255)),
          u16(COLOR_TYPE_NORMAL),
        ]),
      ),
    ),
    block(BLOCK_GROUP_END, Buffer.alloc(0)),
  ];
  const header = Buffer.concat([Buffer.from(SIGNATURE, 'ascii'), u16(VERSION_MAJOR), u16(VERSION_MINOR), u32(blocks.length)]);
  return Buffer.concat([header, ...blocks]);
}

// Parses a file written by writeAse and returns its colours as [{ name, hex }].
export function readAse(buffer) {
  if (buffer.toString('ascii', 0, 4) !== SIGNATURE) throw new Error('not an ASE file: missing ASEF header');
  if (buffer.readUInt16BE(4) !== VERSION_MAJOR || buffer.readUInt16BE(6) !== VERSION_MINOR) {
    throw new Error('unexpected ASE version');
  }
  const count = buffer.readUInt32BE(8);
  const colors = [];
  let offset = 12;
  for (let i = 0; i < count; i += 1) {
    const type = buffer.readUInt16BE(offset);
    const length = buffer.readUInt32BE(offset + 2);
    const body = buffer.subarray(offset + 6, offset + 6 + length);
    offset += 6 + length;
    if (type !== BLOCK_COLOR) continue;
    const units = body.readUInt16BE(0);
    let label = '';
    for (let u = 0; u < units - 1; u += 1) label += String.fromCharCode(body.readUInt16BE(2 + u * 2));
    const at = 2 + units * 2;
    if (body.toString('ascii', at, at + 4) !== MODEL_RGB) throw new Error(`${label}: not an RGB swatch`);
    const hex = [0, 1, 2]
      .map((c) => Math.round(body.readFloatBE(at + 4 + c * 4) * 255).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    colors.push({ name: label, hex: `#${hex}` });
  }
  if (offset !== buffer.length) throw new Error('trailing bytes after the last ASE block');
  return colors;
}
