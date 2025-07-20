// Inisialisasi Supabase client
const supabase = supabase.createClient(
  "https://ztlllhmkfwfbijvaitas.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0bGxsaG1rZndmYmlqdmFpdGFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTA3NTIsImV4cCI6MjA2ODU2Njc1Mn0.DyX-4GEBdlXQnZVRnD3oCPR9D6xu_yaaGM5-cUsg_oI"
);

async function loginWithEmail() {
  const email = document.getElementById("email").value;
  const message = document.getElementById("message");

  if (!email) {
    message.textContent = "Email tidak boleh kosong!";
    return;
  }

  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    message.textContent = "Gagal kirim OTP: " + error.message;
  } else {
    message.textContent = "✅ Cek email kamu untuk link login!";
  }
}
