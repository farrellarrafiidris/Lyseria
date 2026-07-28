// =============================
// Countdown Setting
// =============================

// Tahun, Bulan, Tanggal, Jam, Menit
const launchDate = new Date("2026-08-28T19:00:00");

const countdown = document.getElementById("countdown");

function updateCountdown() {

    const now = new Date();

    const distance = launchDate - now;

    if (distance <= 0) {

        countdown.innerHTML = "✨ Now Live";

        return;

    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));

    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    countdown.innerHTML =
        `${days}d ${hours}h ${minutes}m ${seconds}s`;

}

updateCountdown();

setInterval(updateCountdown, 1000);