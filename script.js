// Initialize Lenis
const lenis = new Lenis({
    auto: true,
});

// Animation frame setup
function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Scroll event logging
lenis.on('scroll', (e) => {
    console.log(e);
});