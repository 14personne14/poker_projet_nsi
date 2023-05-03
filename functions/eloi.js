const JeuCartes = require('./card');

function dit_la_main_la_meilleure_en_fonction_de_qui_que_c_est_qui_prend_la_main(main,cartes_communes){
    var all_cards = main.concat(cartes_communes);
    console.log(all_cards)
    for (var i = 0; i < all_cards.length; i++){
        
        min = all_cards[i].valeur; 
        var k = i; 
        console.log(min);
        
        for (var j = i+1; j < all_cards.length; j++) {
            if (all_cards[j].valeur < min) {
                k = j; 
                min = all_cards[j].valeur; 
            }
        }
        
        var m = all_cards[i]; 
        all_cards[i] = all_cards[k]; 
        all_cards[k] = m; 
        console.log('swap', all_cards[i].valeur, all_cards[k].valeur);  
    }
    return all_cards
}

var j = new JeuCartes()
j.melanger()
var main = j.pioche(2)
var flop = j.pioche(5)
console.log(dit_la_main_la_meilleure_en_fonction_de_qui_que_c_est_qui_prend_la_main(main, flop)); 
    
    
    
module.export=dit_la_main_la_meilleure_en_fonction_de_qui_que_c_est_qui_prend_la_main;