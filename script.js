
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
const drawExifToggle = document.getElementById('drawExifToggle');
const drawDateToggle = document.getElementById('drawDateToggle');
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
  const shorterSide = Math.min(w, h);
  const fontSizeRatio = parseFloat(fontSizeRatioSlider.value) / 100;
  const fontSize = Math.round(shorterSide * fontSizeRatio);
  const font = fontFamilySelect.value;
  const fontColor = document.getElementById("fontColor")?.value || "#000000";
  ctx.font = `${fontSize}px ${font}`;
  ctx.fillStyle = fontColor;
  ctx.textBaseline = "bottom";

  const padding = 10;

  // Exif情報（右下）
  if (drawExifToggle.checked) {
    const parts = [];

    if (document.getElementById('showMake')?.checked) parts.push(data.make || "?");
    if (document.getElementById('showModel')?.checked) parts.push(data.model || "?");
    if (document.getElementById('showFnum')?.checked) parts.push(`f/${data.fnum || "?"}`);
    if (document.getElementById('showSS')?.checked) parts.push(`${formatShutterSpeed(data.ss)}s`);
    if (document.getElementById('showISO')?.checked) parts.push(`ISO ${data.iso || "?"}`);
    if (document.getElementById('showFocal')?.checked) parts.push(`${data.focal || "?"}mm`);

    const exifLine = parts.join(" ・ ");
    const exifW = ctx.measureText(exifLine).width;
    const exifX = w - exifW - padding;
    ctx.fillText(exifLine, exifX - fontSize, h - fontSize - padding);
  }

  // 撮影日（左下）
  if (drawDateToggle.checked) {
    if (data.dateTimeOriginal && typeof data.dateTimeOriginal === "string") {
      let dateStr = "----/--/--";
      const match = data.dateTimeOriginal.match(/(\d{4}):(\d{2}):(\d{2})/);
      if (match) {
        const separator = document.getElementById('dateSeparator')?.value || "/";
        dateStr = [match[1], match[2], match[3]].join(separator);
      }
      ctx.fillText(dateStr, padding + fontSize, h - fontSize - padding);
    }
  }
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
      make, model, fnum, ss: ssRaw, iso, focal, dateTimeOriginal: dtOrig
    };
    exifData.camera = `${make} ${model}`.trim();

    const ssFormatted = formatShutterSpeed(ssRaw);
    const dateFormatted = (dtOrig && typeof dtOrig === "string" && dtOrig.match(/(\d{4}):(\d{2}):(\d{2})/))
      ? dtOrig.replace(/:/g, "/").split(" ")[0]
      : "?";


    const tableHTML = `
    <table>
      <tr><th>メーカー名</th><td>${make || "?"}</td></tr>
      <tr><th>機種名</th><td>${model || "?"}</td></tr>
      <tr><th>F値</th><td>${fnum || "?"}</td></tr>
      <tr><th>シャッタースピード</th><td>${ssFormatted}</td></tr>
      <tr><th>ISO感度</th><td>${iso || "?"}</td></tr>
      <tr><th>焦点距離</th><td>${focal || "?"}mm</td></tr>
      <tr><th>撮影日時</th><td>${dateFormatted}</td></tr>
    </table>
  `;
    exifInfo.innerHTML = tableHTML;
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

  const fontFamily = fontFamilySelect.value;
  const frameColor = document.getElementById("frameColor").value;

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
  baseCtx.fillStyle = frameColor;
  ctx.fillStyle = frameColor;
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
