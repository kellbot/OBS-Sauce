import * as sauce from '/shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
let gameConnection;

let odoSprite = {height: 16, width: 12, x: 0, y: -460};


const settings = common.settingsStore.get(null, {
   saveProgress: true,
   currentProgress: 0
});

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
    if (mph > 39) {
        needleAngle = 165;
    } else if (mph > 35) { 
        needleAngle = 150;
    } else if (mph > 32) { 
        needleAngle = 135;
    } else if (mph >= 30) {
        needleAngle = 120;
    } else if (mph >= 25) {
        needleAngle = 105;
    }else if(mph >= 20) {
        needleAngle = 90;
    } else if (mph >= 15) {
        needleAngle = 75;
    } else if(mph > 12) {
        needleAngle = 60;
    }else if(mph >= 10) {
        needleAngle = 45;

    }else if(mph >= 8) {
        needleAngle = 30;
    } else if (mph > 0 ) {
        needleAngle = 15;

    } else {
        needleAngle = 0;
    }
    needle.className = `spd-${needleAngle}`;
    
}

function setTreeSpin(duration) {
    const tree = document.querySelector('#tree');
    tree.style.animationDuration = duration;

}

function setDriverName(name){
    name = name.toLowerCase();
    let letterWidth = 16;
    let namePlate = document.querySelector('#driver-name');
    let nameWidth = name.length * letterWidth;
    const styles = window.getComputedStyle(namePlate);
    const left = parseInt(styles.getPropertyValue('left'));
    const width = parseInt(styles.getPropertyValue('width'));

    namePlate.style.left = left + width/2 - nameWidth/2 + 'px';

    for (var i = 0; i < name.length; i++) {
       
        let letterId;
        if (name.charCodeAt(i) == 32){
            letterId = 0;
        } else {
           letterId = name.charCodeAt(i) - 96;
        } 

        let letter = document.createElement('div');
        letter.classList = 'nameletter';
        letter.style.backgroundPositionX = (-128 - (letterId-1) * letterWidth) + 'px';

        namePlate.appendChild(letter);
    }
}

function setOdo(meters) {
    let odo = document.querySelector('#odometer');

    //desert bus is in Miles, because America
    let miles = (meters / 1609.344);
    //multiply it by 10 because I hate dealing with decimals
    miles = miles * 10;

    let digits = odo.children;
    for (const digit of digits){
        let place = digit.dataset.place;
        if (place == 1){ //decimal gets special handling
            digit.dataset.number = miles / Math.pow(10, place - 1) % 10;
            renderOdoNumber(digit);
        } else {
            digit.dataset.number = getDigit(miles, place);
            animateOdoNumber(digit);
        }
    
    }
}
//renders the odo wheel relative to how close it is to the next
function renderOdoNumber(digitElem){
    let currentNumber = digitElem.dataset.number;

    let wholeBgY = odoSprite.y - odoSprite.height * currentNumber;
    let newBgY = wholeBgY;
    digitElem.style.backgroundPositionY = newBgY + 'px';
}

//animates a flip to the next number
function animateOdoNumber(digitElem){
    let currentNumber = digitElem.dataset.number;

    let currentBgY = window.getComputedStyle(digitElem).getPropertyValue("background-position-y");
    let newBgY = odoSprite.y - odoSprite.height * currentNumber;
    const numberRoll = [
        { backgroundPositionY: currentBgY },
        { backgroundPositionY: newBgY + 'px' }
    ]

    const rollTiming = {
        duration: 1000,
        iterations: 1
    }

    digitElem.animate(numberRoll, rollTiming);


}


export async function main() {
    common.initInteractionListeners();
  

    const gcs = await common.rpc.getGameConnectionStatus();
    gameConnection = !!(gcs && gcs.connected);

    let athleteId;
    let startDistance;
    let odoDistance;

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) { //new rider
            athleteId = watching.athleteId;
            startDistance = watching.state.distance;
            setDriverName(watching.athlete.fLast.substring(0,16));
            console.log(watching);
        }
        
        odoDistance = watching.state.distance - startDistance;

        setOdo(odoDistance);
        setSpeedo(watching.state.speed);

        let treeDuration = (20 / watching.state.cadence) + 's';
        setTreeSpin(treeDuration);
    });


}