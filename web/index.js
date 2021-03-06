const container = document.querySelector(".container");

function fetchPokemon() { 
    fetch(`http://localhost:5000/pokedex`)
     .then((res) => res.json())
     .then((pokemon) => {
     
      pokemon.map(i =>showPokemon(i.id, i.name, i.type, i.img));
       
     });
 };

function showPokemon(id, name, type, img){ 
    let div = document.createElement('div');
    let divInnerHtml = 
    `<div class="card">  
      <div class="container">
      <div class="row">
        <h4 class="pName">${name}</h4>    
        <h4 class="pNum">#${id}</h4>
        <div class="line"></div>
      </div>
      <img src="${img}";
      </div>
    </div>`
    div.innerHTML = divInnerHtml;
    div.classList.add(type);
    container.appendChild(div);
}

fetchPokemon()