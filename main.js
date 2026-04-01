import p5 from 'p5';

window.p5 = p5;
globalThis.p5 = p5;

async function bootstrapP5() {
	try {
		await import('p5.sound');
	} catch (err) {
		console.warn('p5.sound failed to load:', err);
	}

	window.dispatchEvent(new Event('p5-ready'));
}

bootstrapP5();
