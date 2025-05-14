
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const preview = document.getElementById('preview');
const marginSlider = document.getElementById('marginSlider');
const marginValue = document.getElementById('marginValue');
const formatSelect = document.getElementById('format');
const jpgQualitySlider = document.getElementById('jpgQuality');
const jpgQualityValue = document.getElementById('jpgQualityValue');
const fontSizeInput = document.getElementById('fontSize');
const fontFamilySelect = document.getElementById('fontFamily');
const exifInfo = document.getElementById('exifInfo');
const saveButton = document.getElementById('saveButton');
const exifToggle = document.getElementById('exifToggle');
const fontSizeRatioSlider = document.getElementById('fontSizeRatioSlider');
const fontSizeRatioValue = document.getElementById('fontSizeRatioValue');

// スライダー動かしたら表示も更新
fontSizeRatioSlider.oninput = () => {
  fontSizeRatioValue.textContent = fontSizeRatioSlider.value + "%";
};

let originalImage = null;
let exifData = {};
let originalFileName = "output";
let baseCanvas = document.createElement('canvas');
let baseCtx = baseCanvas.getContext('2d');

marginSlider.oninput = () => marginValue.textContent = marginSlider.value + "%";
jpgQualitySlider.oninput = () => jpgQualityValue.textContent = jpgQualitySlider.value;

function formatShutterSpeed(ss) {
  if (typeof ss === 'object' && ss.numerator && ss.denominator) {
    return `${ss.numerator}/${ss.denominator}`;
  } else if (typeof ss === 'number') {
    return `1/${Math.round(1 / ss)}`;
  } else {
    return ss;
  }
}

function parseAspect(value) {
  const [w, h] = value.split(":").map(Number);
  return w / h;
}

function drawExif(ctx, w, h, data) {
  if (!exifToggle.checked) return;

  const shorterSide = Math.min(w, h);
  const fontSizeRatio = parseFloat(fontSizeRatioSlider.value) / 100;
  const fontSize = Math.round(shorterSide * fontSizeRatio);
  const font = fontFamilySelect.value;
  ctx.font = `${fontSize}px ${font}`;
  ctx.fillStyle = "black";
  ctx.textBaseline = "bottom";

  const padding = 10;

  // Exif情報（右下）
  const exifLine = `${data.camera || "?"} ・ ƒ/${data.fnum || "?"} ・ ${formatShutterSpeed(data.ss)}s ・ ISO ${data.iso || "?"} ・ ${data.focal || "?"}mm`;
  const exifW = ctx.measureText(exifLine).width;
  const exifX = w - exifW - padding;
  ctx.fillText(exifLine, exifX - fontSize, h - fontSize - padding);

  // 撮影日（左下）
  let dateStr = "----/--/--";
  if (data.dateTimeOriginal && typeof data.dateTimeOriginal === "string") {
    const match = data.dateTimeOriginal.match(/(\d{4}):(\d{2}):(\d{2})/);
    if (match) {
      dateStr = `${match[1]}/${match[2]}/${match[3]}`;
    }
  }
  ctx.fillText(dateStr, padding + fontSize, h - fontSize - padding);
}

function handleFile(file) {
  originalFileName = file.name.replace(/\.[^/.]+$/, "");

  EXIF.getData(file, function () {
    const make = EXIF.getTag(this, "Make") || "";
    const model = EXIF.getTag(this, "Model") || "";
    const fnum = EXIF.getTag(this, "FNumber");
    const ssRaw = EXIF.getTag(this, "ExposureTime");
    const iso = EXIF.getTag(this, "ISOSpeedRatings");
    const focal = EXIF.getTag(this, "FocalLength");
    const dtOrig = EXIF.getTag(this, "DateTimeOriginal");
    exifData = {
      make: make,
      model: model,
      camera: `${make} ${model}`.trim(),
      fnum: fnum,
      ss: ssRaw,
      iso: iso,
      focal: focal,
      dateTimeOriginal: dtOrig
    };
    exifInfo.textContent = `📷 Camera: ${exifData.camera}
ƒ/${exifData.fnum || "?"} ・ ${formatShutterSpeed(exifData.ss)}s ・ ISO ${exifData.iso} ・ ${exifData.focal || "?"}mm`;
  });

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;

      const marginRatio = (img.width >= img.height) ? 0.03 : 0.06;  // 横長→3%、縦長→6%

      // ✅ 白枠サイズをスライダーUIに反映
      marginSlider.value = marginRatio * 100;
      marginValue.textContent = marginSlider.value + "%";

      // 短辺を取得して、白枠込みサイズを計算
      // const shorterSide = Math.min(img.width, img.height);
      // const totalShortSide = shorterSide * (1 + 2 * marginRatio);

      // // フォントサイズを設定
      // const fontSize = Math.round(totalShortSide * FONT_SIZE_RATIO);
      // fontSizeInput.value = fontSize;

      preview.innerHTML = "";
      const imgTag = document.createElement("img");
      imgTag.src = e.target.result;
      imgTag.style.maxWidth = "100%";
      imgTag.style.maxHeight = "80vh";
      imgTag.style.objectFit = "contain";
      preview.appendChild(imgTag);
      saveButton.style.display = "none";
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById('dropzone').addEventListener('dragover', e => e.preventDefault());
document.getElementById('dropzone').addEventListener('drop', e => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});
document.getElementById('upload').addEventListener('change', e => {
  if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

async function processImage() {
  if (!originalImage) return alert("画像を先に選択してください");

  // const fontSize = fontSizeInput.value;
  const fontFamily = fontFamilySelect.value;

  await document.fonts.load(`10px ${fontFamily}`);
  await document.fonts.ready;

  const iw = originalImage.width;
  const ih = originalImage.height;
  const aspect = parseAspect(document.getElementById('aspect').value);
  const marginRatio = parseFloat(marginSlider.value) / 100;
  let cw, ch;
  if (iw / ih >= aspect) {
    cw = iw * (1 + 2 * marginRatio);
    ch = cw / aspect;
  } else {
    ch = ih * (1 + 2 * marginRatio);
    cw = ch * aspect;
  }

  baseCanvas.width = canvas.width = cw;
  baseCanvas.height = canvas.height = ch;
  baseCtx.fillStyle = ctx.fillStyle = "white";
  baseCtx.fillRect(0, 0, cw, ch);
  baseCtx.drawImage(originalImage, (cw - iw) / 2, (ch - ih) / 2);
  ctx.drawImage(baseCanvas, 0, 0);
  drawExif(ctx, cw, ch, exifData);

  const dataURL = canvas.toDataURL('image/jpeg', parseInt(jpgQualitySlider.value) / 100);
  preview.innerHTML = "";
  const img = document.createElement("img");
  img.src = dataURL;
  img.style.maxWidth = "100%";
  img.style.maxHeight = "80vh";
  img.style.objectFit = "contain";
  preview.appendChild(img);

  saveButton.onclick = () => {
    const zeroth = {};
    const exif = {};

    if (exifData.make) zeroth[piexif.ImageIFD.Make] = exifData.make;
    if (exifData.model) zeroth[piexif.ImageIFD.Model] = exifData.model;
    zeroth[piexif.ImageIFD.Software] = "Exif Overlay Tool";
    zeroth[piexif.ImageIFD.Orientation] = 1;

    if (exifData.dateTimeOriginal)
      exif[piexif.ExifIFD.DateTimeOriginal] = exifData.dateTimeOriginal;

    if (exifData.fnum)
      exif[piexif.ExifIFD.FNumber] = [Math.round(exifData.fnum * 10), 10];

    if (exifData.ss && typeof exifData.ss === 'object')
      exif[piexif.ExifIFD.ExposureTime] = [exifData.ss.numerator, exifData.ss.denominator];
    else if (typeof exifData.ss === 'number')
      exif[piexif.ExifIFD.ExposureTime] = [1, Math.round(1 / exifData.ss)];

    if (exifData.iso)
      exif[piexif.ExifIFD.ISOSpeedRatings] = exifData.iso;

    if (exifData.focal)
      exif[piexif.ExifIFD.FocalLength] = [Math.round(exifData.focal * 10), 10];

    const exifObj = { "0th": zeroth, "Exif": exif };
    const exifBytes = piexif.dump(exifObj);
    const inserted = piexif.insert(exifBytes, dataURL);

    const link = document.createElement("a");
    link.href = inserted;
    link.download = `${originalFileName}_framed.jpg`;
    link.click();
  };

  saveButton.style.display = "inline-block";
}
