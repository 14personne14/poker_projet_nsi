const JeuCartes = require('./card');

function dit_la_main_la_meilleure_en_fonction_de_qui_que_c_est_qui_prend_la_main(main,cartes_communes){
    var all_cards = main.concat(cartes_communes);
    console.log(all_cards)
    for (var i = all_cards.length; i>0;i--){
        var min = all_cards[0].valeur;
        console.log(min);
        var k=0;
        for (var j = 0; j<i;j++){
            console.log('indice', all_cards[j].valeur)
            if (all_cards[j].valeur<min){
                k=j;
                min=all_cards[j].valeur;
                console.log(min);
            }
        }
        var m= all_cards[i];
        all_cards[i]=all_cards[k];
        all_cards[k]=m;
    }
    return all_cards
}

var j = new JeuCartes()
j.melanger()
var main = j.pioche(2)
var flop = j.pioche(5)
console.log(dit_la_main_la_meilleure_en_fonction_de_qui_que_c_est_qui_prend_la_main(main, flop)); 
    
    
    
module.export=dit_la_main_la_meilleure_en_fonction_de_qui_que_c_est_qui_prend_la_main;