import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import { elements, renderLoader, clearLoader } from './views/base';

/** Etat général de l'app
 * - Objet Search 
 * - Objet Recette actuelle
 * - Objet Liste de courses
 * - Recettes "Likées"
 */
const state = {};

/** 
 * SEARCH CONTROLLER
 */
const controlSearch = async () => {
    // 1) récupérer la requête à partir de la vue
    const query = searchView.getInput();

    if (query) {
        // 2) Nouvel objet "Requête" à ajouter à l'état
        state.search = new Search(query);

        // 3) Préparer l'UI pour afficher les résultats
        searchView.clearInput();
        searchView.clearResults();
        renderLoader(elements.searchRes);

        try {
            // 4) Rechercher les recettes
            await state.search.getResults();
    
            // 5) Afficher les résultats dans la vue
            clearLoader();
            searchView.renderResults(state.search.result);
        } catch (err) {
            alert('Something wrong with the search...');
            clearLoader();
        }
    }
}
// Accrocher le Search Controller au formulaire
elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});


elements.searchResPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if (btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    }
});


/** 
 * RECIPE CONTROLLER
 */
const controlRecipe = async () => {
    // Récupérer l'ID de l'url
    const id = window.location.hash.replace('#', '');

    if (id) {
        // Preparer l'UI pour les changements
        recipeView.clearRecipe();
        renderLoader(elements.recipe);

        // Souligner l'élément sélectionné
        if (state.search) searchView.highlightSelected(id);

        // Creer le nouvel objet Recipe 
        state.recipe = new Recipe(id);

        try {
            // Récupérer les ingrédients
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();

            // Calculer les parts et le temps
            state.recipe.calcTime();
            state.recipe.calcServings();
    
            // Afficher la recette
            clearLoader();
            recipeView.renderRecipe(
                state.recipe,
                state.likes.isLiked(id)
            );

        } catch (err) {
            console.log(err);
            alert('Error processing recipe!');
        }
    }
};
 
['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));


/** 
 * LIST CONTROLLER
 */
const controlList = () => {
    // Créer une nouvelle liste de courses
    if (!state.list) state.list = new List();

    // Ajouter chaque ingrédient
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    });
}

// Mettre à jour la liste
elements.shopping.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    // Gérer le bouton de suppression
    if (e.target.matches('.shopping__delete, .shopping__delete *')) {
        state.list.deleteItem(id);
        listView.deleteItem(id);

    // Gérer le compteur
    } else if (e.target.matches('.shopping__count-value')) {
        const val = parseFloat(e.target.value, 10);
        state.list.updateCount(id, val);
    }
});


/** 
 * LIKE CONTROLLER
 */
const controlLike = () => {
    if (!state.likes) state.likes = new Likes();
    const currentID = state.recipe.id;

    // si pas encore de like sur la recette affichée
    if (!state.likes.isLiked(currentID)) {
        const newLike = state.likes.addLike(
            currentID,
            state.recipe.title,
            state.recipe.author,
            state.recipe.img
        );
        likesView.toggleLikeBtn(true);

        likesView.renderLike(newLike);

    // Il y a déjà un "like"
    } else {
        state.likes.deleteLike(currentID);

        likesView.toggleLikeBtn(false);

        likesView.deleteLike(currentID);
    }
    likesView.toggleLikeMenu(state.likes.getNumLikes());
};


window.addEventListener('load', () => {
    state.likes = new Likes();

    state.likes.readStorage();

    likesView.toggleLikeMenu(state.likes.getNumLikes());

    state.likes.likes.forEach(like => likesView.renderLike(like));
});


elements.recipe.addEventListener('click', e => {
    if (e.target.matches('.btn-decrease, .btn-decrease *')) {

        if (state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            recipeView.updateServingsIngredients(state.recipe);
        }
    } else if (e.target.matches('.btn-increase, .btn-increase *')) {

        state.recipe.updateServings('inc');
        recipeView.updateServingsIngredients(state.recipe);
    } else if (e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        controlList();
    } else if (e.target.matches('.recipe__love, .recipe__love *')) {
        controlLike();
    }
});
