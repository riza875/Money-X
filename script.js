import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  "https://ztlllhmkfwfbijvaitas.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0bGxsaG1rZndmYmlqdmFpdGFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTA3NTIsImV4cCI6MjA2ODU2Njc1Mn0.DyX-4GEBdlXQnZVRnD3oCPR9D6xu_yaaGM5-cUsg_oI"
);

window.sendOTP = async function () {
  const phone = document.getElementById('phone').value.trim();
  const message = document.getElementById('message');

  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    message.textContent = "❌ Gagal kirim OTP: " + error.message;
  } else {
    message.textContent = "✅ OTP dikirim ke " + phone;
    document.getElementById('otp-section').style.display = 'block';
  }
};

window.verifyOTP = async function () {
  const phone = document.getElementById('phone').value.trim();
  const otp = document.getElementById('otp').value.trim();
  const message = document.getElementById('message');

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: otp,
    type: 'sms'
  });

  if (error) {
    message.textContent = "❌ Verifikasi gagal: " + error.message;
  } else {
    message.textContent = "✅ Login berhasil! Selamat datang.";
    // Bisa redirect ke game di sini
    // window.location.href = "/game.html";
  }
};
