const goButton = document.getElementById('go');
const chooseFile = document.getElementById("choose-file");
const imgPreview = document.getElementById("img-preview");
const whiteblackCheckBox = document.getElementById('whiteblack');

const sharpenAmountRange = document.getElementById('sharpenAmount');
const doubleSharpenCheckbox = document.getElementById('doubleSharpen');
const contrastAmountRange = document.getElementById('contrastAmount');
const jpegQualityRange = document.getElementById('jpegQuality');

var queue = [];
let dragStartIndex;

async function toPDF() {
	var doc = await PDFLib.PDFDocument.create();
	var counter = 0;
	var tempDiv = document.createElement("div");
	let myImages = [];
	document.body.appendChild(tempDiv);
	for (let i = 0; i < queue.length; i++) {
		let jpgUrl = queue[i];
		counter++;
		var promise = new Promise(async function(resolve, reject) {
			const newBlob = await fetch(jpgUrl).then((res) => res.blob()).then(async (blob) => {
				const imgBitmap = await createImageBitmap(blob);
				const w = imgBitmap.width;
				const h = imgBitmap.height;
				let myCanvas = document.createElement('canvas');
				myCanvas.id = "img" + counter;
				myCanvas.width = w;
				myCanvas.height = h;
				myCanvas.getContext('2d').drawImage(imgBitmap, 0, 0, w, h);
				tempDiv.appendChild(myCanvas);
				Caman("#" + myCanvas.id, function() {
					let sharpenAmount = parseInt(sharpenAmountRange.value);
					let contrastAmount = parseInt(contrastAmountRange.value);
					if (whiteblackCheckBox.checked)
						this.greyscale();
					
					this.sharpen(sharpenAmount);
					this.contrast(contrastAmount);
					if (doubleSharpenCheckbox.checked)
						this.sharpen(sharpenAmount);
					this.render(function() {
						myImages.push(myCanvas);
						resolve(myCanvas);
					});
				});
			});
		});
		await promise;
	}
	for (let i = 0; i < myImages.length; i++) {
		let pr = new Promise(async function(resolve, reject) {
			let jpegQuality = parseFloat(jpegQualityRange.value);
			myImages[i].toBlob(async function(blob) {
				const jpgArray = await blob.arrayBuffer();
				const jpgImage = await doc.embedJpg(jpgArray);
				const jpgDims = jpgImage.scale(1)
				const page = await doc.addPage([jpgDims.width, jpgDims.height]);
				await page.drawImage(jpgImage, {
					x: page.getWidth() / 2 - jpgDims.width / 2,
					y: page.getHeight() / 2 - jpgDims.height / 2,
					width: jpgDims.width,
					height: jpgDims.height,
				});
				resolve('sa');
			}, 'image/jpeg', jpegQuality); //0.1 by default
		});
		await pr;
	}
	const pdfDataUri = await doc.saveAsBase64({ dataUri: true });
	document.getElementById('pdf').src = pdfDataUri;
	tempDiv.parentNode.removeChild(tempDiv);
}

function readFile(file){
	return new Promise(function(resolve,reject) {
		let fr = new FileReader();

		fr.onload = function() {
			queue.push(URL.createObjectURL(file));
			resolve(fr.result);
		};

		fr.onerror = function() {
			reject(fr);
		};
		fr.readAsArrayBuffer(file);
	});
}

function getImgData(ev) {
	queue = [];
	let files = ev.currentTarget.files;
	let readers = [];

	// Abort if there were no files selected
	if(!files.length) return;

	// Store promises in array
	for (let i = 0; i < files.length; i++) {
		readers.push(readFile(files[i]));
	}
	// Trigger Promises
	Promise.all(readers).then((values) => {
		// Values will be an array that contains an item
		// with the text of every selected file
		// ["File1 Content", "File2 Content" ... "FileN Content"]
		console.log(values);
	});
}

goButton.addEventListener('click', toPDF);

chooseFile.addEventListener("change", function(ev) {
	getImgData(ev);
}, false);
