import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Ganti dengan milikmu
const supabase = createClient(
  "https://ztlllhmkfwfbijvaitas.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0bGxsaG1rZndmYmlqdmFpdGFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTA3NTIsImV4cCI6MjA2ODU2Njc1Mn0.DyX-4GEBdlXQnZVRnD3oCPR9D6xu_yaaGM5-cUsg_oI"
);

let user = null;
let currentLane = 1;
let score = 0;
const lanes = [100, 200, 300];
let character = null;

// DOM refs
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const saldoText = document.getElementById("saldo");

loginBtn.onclick = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google" });
};

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

// Auth state listener
supabase.auth.onAuthStateChange(async (event, session) => {
  user = session?.user || null;
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    document.getElementById("game").style.display = "block";
    character = document.getElementById("character");
    await initPlayer();
    startGame();
  }
});

async function initPlayer() {
  const { data, error } = await supabase
    .from("points")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    await supabase.from("points").insert([{ user_id: user.id, current_points: 0 }]);
    score = 0;
  } else {
    score = data.current_points;
  }

  saldoText.innerText = score;
}

async function updatePoints(change) {
  score += change;
  saldoText.innerText = score;

  await supabase
    .from("points")
    .update({ current_points: score })
    .eq("user_id", user.id);
}

// Game Loop
function startGame() {
  let y = 400;
  setInterval(() => {
    y -= 5;
    character.style.top = y + "px";
    if (y < 50) {
      updatePoints(10); // naik poin tiap putaran
      y = 400;
    }
  }, 100);
}

// Kontrol kiri-kanan
document.getElementById("left").onclick = () => {
  if (currentLane > 0) currentLane--;
  character.style.left = lanes[currentLane] + "px";
};

document.getElementById("right").onclick = () => {
  if (currentLane < 2) currentLane++;
  character.style.left = lanes[currentLane] + "px";
};
