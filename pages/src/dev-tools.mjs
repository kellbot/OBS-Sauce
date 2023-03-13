import { animateLeftTurn } from "./game.mjs";

/* General utilities */

export function run_test(testName) {
    if (testName == 'turn-wheel') {
        animateLeftTurn();
    }
}


/* Initializer */
export function init(){
    const toolbar = document.getElementById('dev-tools');
    const buttons = toolbar.querySelectorAll('button');
    
    /* Event listeners */
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            run_test(button.dataset.test);
        });
    });
}