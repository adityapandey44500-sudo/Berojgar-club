/* =========================================================
   Berojgar Club — अपनी playlist
   ---------------------------------------------------------
   1.  Sabhi MP3 files is folder ke andar daalo:   songs/
       (example: songs/yeh-shaam-mastani.mp3)
   2.  Sabhi cover/album art images is folder mein daalo: covers/
       (1:1 square images .jpg ya .png, example: covers/yeh-shaam.jpg)
   3.  Neeche TRACKS array mein har gaane ke liye ek object add karo:

       {
         title  : "Ye Shaam Mastani",
         artist : "Kishore Kumar",
         file   : "yeh-shaam-mastani.mp3",     // songs/ ke andar ka filename
         cover  : "yeh-shaam.jpg",             // [optional] covers/ ka filename
       }

   Koi cover nahi hai toh `cover` line hata do — auto-generate ho jayega.
   ========================================================= */

window.BC_PLAYLIST = [

  /* ------ DEMO placeholder (remove kar dena jab apne gane daalo) ------ */
  {
    title: "Apna pehla gaana daalo — (placeholder)",
    artist: "Berojgar Club Radio",
    file: null,   // jab tak file null hai, player visual animation mode mein chalta hai
    cover: null,
  },

  // Example:
  // { title: "Ye Shaam Mastani",        artist: "Kishore Kumar",    file: "ye-shaam.mp3",      cover: "ye-shaam.jpg" },
  // { title: "Dum Maro Dum",            artist: "R. D. Burman",     file: "dum-maro-dum.mp3",  cover: "dum-maro-dum.jpg" },
  // { title: "Phir Se Ud Chala",        artist: "Mohit Chauhan",    file: "phir-se-ud-chala.mp3" },
];
