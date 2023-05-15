const JeuCartes = require('./card');
const proba = require('./proba/src/index.js');
console.log(proba.hs([51, 50], 2)) // -> 0.8553, hand strength of AA, 2players, preflop.

module.export=proba;