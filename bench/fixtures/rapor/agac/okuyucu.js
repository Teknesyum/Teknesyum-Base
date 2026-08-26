const { dene } = require('./kuyruk');
const yazici = require('./yazici');

async function isle(isler) {
  for (const is of isler) {
    const sonuc = await dene(is);
    if (sonuc !== null) yazici.yaz({ ad: is.ad, sonuc });
  }
}

module.exports = { isle };
