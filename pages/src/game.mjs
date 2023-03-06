import * as sauce from '/shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
let gameConnection;


const bus = document.querySelector('#bus');
let spriteSheet;
let sprites = new Map([
    ['#bus', {width: 640, height: 480 }], ['#steering-wheel', {width: 768, height: 130}], ['#tree', {width: 204, height: 48}], ['default', {width: 654, height: 1042 }]
]);
let busScale = {x: 1, y: 1};
let athlete;


let settings = common.settingsStore.get(null, {
    dbEasyMode : true,
    dbMeterage: 0,
    dbResolution: 'fourx',
});

const startingCoords = new Map([
    ['#bus', {x: 0, y: 0, h: 480, w: 640}],
    ['#speedometer', {y: 386, x: 188, w: 64, h:64}],
    ['#odometer', {x: 364, y: 386, h: null, w: null}],
    ['.black', {h: 16, w: 10, bY: -464, bX: 1}],
    ['.white', {h: 16, w: 10, bY: -464, bX: -12}],
    ['#steering-wheel', {w: 192, h: 130, x: 42, y: 350}],
    ['#driver-name', {w: 260, h: 30, x: 79, y:50}],
    ['#tree', {w: 32, h: 48, x:439, y: 80}],
    ['#needle', {h: 64, w: 64, bY: -640, bX: -192}]
]);


function resizeBus(){
    const div = bus;
    const aspectRatio = 4 / 3;
    const sizes = new Map([['qvga', {w: 320, h:240}],['vga', {w: 640, h: 480} ], ['fourx', {w: 1280, h: 960} ], ['uxga', {w: 1600, h: 1200} ]]);
    if(settings.dbResolution == 'free') {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const windowAspectRatio = windowWidth / windowHeight;
    
        if (windowAspectRatio > aspectRatio) {
        // Window is wider than desired aspect ratio
        const newWidth = Math.floor(windowHeight * aspectRatio / 4) * 4; //this is so we get a  multiple of 20, for the pixels 
        div.style.width = newWidth + 'px';
        div.style.height = newWidth / aspectRatio  + 'px';
        } else {
        // Window is narrower than desired aspect ratio
        const newHeight = Math.floor(windowWidth / aspectRatio / 4) * 4;
        div.style.width = newHeight * aspectRatio + 'px';
        div.style.height = newHeight + 'px';
        } 
    } else {

        let size = sizes.get(settings.dbResolution);

        div.style.width = size.w + 'px';
        div.style.height = size.h + 'px';
    }


    busScale.x = parseInt(div.style.width) / startingCoords.get('#bus').w;   
    busScale.y = parseInt(div.style.height) / startingCoords.get('#bus').h;   

    console.log(busScale);

    startingCoords.forEach( function( coords, selector ) {
        const elems = document.querySelectorAll(selector);
        elems.forEach( (elem) => {
            if (coords.x) elem.style.left = coords.x * busScale.x + 'px';
            if (coords.y) elem.style.top = coords.y * busScale.y + 'px';
            if (coords.w) elem.style.width = coords.w * busScale.x + 'px';
            if (coords.h) elem.style.height = coords.h * busScale.y + 'px';

            if (sprites.get(selector)) {
                spriteSheet = sprites.get(selector);
            } else {
                spriteSheet = sprites.get('default');
            }
            //scale the background
            elem.style.backgroundSize = `${spriteSheet.width * busScale.x}px ${spriteSheet.height * busScale.y}px`;
            if (coords.bX) elem.style.backgroundPositionX = coords.bX * busScale.x + 'px';
            if (coords.bY) elem.style.backgroundPositionY = coords.bY * busScale.y + 'px';

        });
    }); 
    if (athlete) setDriverName(athlete.athlete.fLast.substring(0,16));
}


function getDigitCount(number) {
    return Math.max(Math.floor(Math.log10(Math.abs(number))), 0) + 1;
  }
function getDigit(number, n, fromLeft) {
    const location = fromLeft ? getDigitCount(number) + 1 - n : n;
    return Math.floor((number / Math.pow(10, location - 1)) % 10);
  }

//takes km per hour
function setSpeedo(kmph){
    let mph = kmph / 1.609;
  
    const needle = document.querySelector('#needle');
    let needleAngle;
    if (mph > 1) { 
        let minSpeed = 10;// -30 degrees
        let maxSpeed = 70; //260
        let  deltaSpeed = maxSpeed - minSpeed;
        let minAngle = -15;
        let maxAngle = 260;
        let deltaAngle = maxAngle - minAngle;
        let slope = deltaAngle / deltaSpeed;
        needleAngle = minAngle + (mph - minSpeed) * slope;
       // console.log(`mph: ${mph} angle: ${needleAngle}`);
    } else {
        needleAngle = -45;
    }
    needle.style.transform = `rotate(${needleAngle}deg)`;
    
}

function setTreeSpin(duration) {
    const tree = document.querySelector('#tree');
    tree.style.animationDuration = duration;

}

function setDriverName(name){

    name = name.toUpperCase();
    let namePlate = document.querySelector('#driver-name');
    let fontSize = 16 * busScale.x;
    namePlate.style.fontSize = fontSize + 'px';
 
    namePlate.innerHTML = name;
}

function setOdo(meters) {
    let odo = document.querySelector('#odometer');

    //desert bus is in Miles, because America
    let miles = meters / 1609.344;
    //multiply it by 10 because I hate dealing with decimals
    miles = miles * 10;

    let digits = odo.children;
    for (const digit of digits){
        let place = digit.dataset.place;
        if (place == 1){ //decimal gets special handling
            digit.dataset.number = (miles / Math.pow(10, place - 1) % 10).toFixed(1);
            renderOdoNumber(digit);
        } else {
            let oldNumber = digit.dataset.number;
            let newNumber = getDigit(miles, place);
            if (oldNumber != newNumber) {
                digit.dataset.number = newNumber;
              //  console.log(`${place} from ${oldNumber} to ${newNumber}`);
                animateOdoNumber(digit);
            }
        }
    
    }
}
//renders the odo wheel relative to how close it is to the next
function renderOdoNumber(digitElem){
    const odoSprite = startingCoords.get('.black'); //math is the same for both
    let currentNumber = digitElem.dataset.number; // get the number from the element

    //find thebackground location for the whole number
    let wholeBgY = odoSprite.bY * busScale.y - odoSprite.h * busScale.y * currentNumber;
    let newBgY = wholeBgY;
    digitElem.style.backgroundPositionY = newBgY + 'px';
}

//animates a flip to the next number
function animateOdoNumber(digitElem){
    const odoSprite = startingCoords.get('.black'); //math is the same for both

    let currentNumber = digitElem.dataset.number;

    let currentBgY = window.getComputedStyle(digitElem).getPropertyValue("background-position-y");
    let unscaledBgY = odoSprite.bY - (odoSprite.h * currentNumber);
    let newBgY = busScale.y * unscaledBgY;

    const numberRoll = [
        { backgroundPositionY: currentBgY},
        { backgroundPositionY: newBgY + 'px' }
    ]

    const rollTiming = {
        duration: 500,
        iterations: 1
    }

    digitElem.animate(numberRoll, rollTiming);
    digitElem.style.backgroundPositionY = newBgY + 'px';
}   


export async function main() {
    common.initInteractionListeners(); 

    window.addEventListener('resize', resizeBus);
    resizeBus();



    const gcs = await common.rpc.getGameConnectionStatus();
    gameConnection = !!(gcs && gcs.connected);

    let athleteId;
    let startDistance;
    let odoDistance;
    common.settingsStore.addEventListener('changed', ev => {
        const changed = ev.data.changed;
        if (changed.has('dbResolution')) {
            resizeBus();
        }
    });

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) { //new rider
            athleteId = watching.athleteId;
            startDistance = watching.state.distance;
            setDriverName(watching.athlete.fLast.substring(0,16));
            console.log(watching);
            athlete = watching;
        }
        if (!settings.dbMeterage) settings.dbMeterage = 0;
        
        odoDistance = watching.state.distance - startDistance;
        if (settings.dbEasyMode) {
            startDistance = watching.state.distance; //reset start to where we are now
            odoDistance = odoDistance +  settings.dbMeterage; //add saved distance to odo
            console.log(odoDistance);
            common.settingsStore.set('dbMeterage', odoDistance);
        }


        setOdo(odoDistance);
        setSpeedo(watching.state.speed);

        let treeDuration = (20 / watching.state.cadence) + 's';
        setTreeSpin(treeDuration);
    });


}