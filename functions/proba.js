const JeuCartes = require('./card');
const proba = require('./proba/src/index.js');
//console.log(proba.hs([51, 50], 2)) // -> 0.8553, hand strength of AA, 2players, preflop.

function get_valeurs_cartes(cartes){
    var new_cartes = [];
    for (var i=0; i<cartes.length;i++){
        new_cartes.push(proba.parse(cartes[i].num2+cartes[i].valeur));
    }
    var valeur = proba.handval(new_cartes);
    var nom_main = proba.handname(valeur);
    return {"nom":nom_main, "valeur":valeur}; 
}

var j = new JeuCartes();
j.melanger();
j=j.pioche(2);
console.log(j);

function get_proba(cartes, nb_joueurs){
    var new_cartes = [];
    for (var i=0; i<cartes.length;i++){
        new_cartes.push(proba.parse(cartes[i].num2+cartes[i].valeur));
    }
    return proba.hs(new_cartes,nb_joueurs)
}

function qui_gagne(liste_joueurs, cartes_communes){
    var valeurs_main = [];
    for (var i=0; i<cartes.length;i++){
        new_cartes.push(get_valeurs_cartes(liste_joueurs.cartes.concat(cartes_communes))["valeur"])
    }
    var max=[new_cartes[0]]
    var ind=[0]
    for (var i=1; i<cartes.length;i++){
        if (new_cartes[i]==max[0]){
            ind.push(i)
        }
        if(new_cartes[i]>max[0]){
            max=[new_cartes[i]]
            ind=[i]
        }
            
    }
    if (ind.length>1){
        var egaux=[]
        for (var i=0; i<new_cartes.length;i++){
            egaux.push(liste_joueurs[ind[i]])
        }
        return (egaux, get_valeurs_cartes(egaux[1])["nom"])
    else{
        return (liste_joueurs[ind[0]], get_valeurs_cartes(liste_joueurs[ind[0]])["nom"])
    
}

module.export=proba;