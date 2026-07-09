import fs from 'fs';

async function fetchJSON() {
  const data = await fetch("https://sbo-database-default-rtdb.firebaseio.com/sbo_data.json").then(r => r.json());
  Object.entries(data).forEach(([id, val]) => {
     console.log(id, val["👤 Profile"]);
  });
}

fetchJSON();
