let sandbox = false;

let teamData = {
	"event" : "WTRL TTT 197",
	"course" : "Richmond UCI Worlds",
	"team": [
		{
			"name" : "Kevin R",
			"zid" : 4548230
		},
		{
			"name" : "Kevin B",
			"zid" : 3935431
		},
		{
			"name" : "Ro",
			"zid" : 2672785
		},
		{
			"name" : "Maik",
			"zid" : 2840298
		},
		{
			"name" : "Dom",
			"zid" : 717384
		},
		{
			"name" : "Mathew",
			"zid" : 3658694
		},
		{
			"name" : "Carl",
			"zid" : 3109268
		}

	]
}

function toHoursAndMinutes(totalSeconds) {
  const totalMinutes = Math.floor(totalSeconds / 60);

  const seconds = Math.abs(Math.floor(totalSeconds % 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { h: hours, m: minutes, s: seconds };
}

$(function() {


	$('#rider-template').hide();
$('#course-name .scrollbox').html(teamData.course);

async function setupSelf(){
	let target = 'self';
	if (sandbox) {
		target = 'watching';
	}
	const response = await fetch("../../../../api/athlete/stats/v1/" + target);
	let userData = await response.json();   	
	refreshStats(userData);
	console.log(userData)
}

function refreshStats(athlete) {
	let riderTime = toHoursAndMinutes(athlete.stats.elapsedTime);
	$('#timer .infolabel').html(
		riderTime.h + ":" + riderTime.m.toString().padStart(2,0) + ":" + riderTime.s.toString().padStart(2,0)
	);
	$('#current-power').html(athlete.state.power.toString() + "W - FTP: " + athlete.athlete.ftp);
	//calculate zone from FTP
	//=(B12/A12 * 100 - 45) / 15 * 16.6
	let zonePCT = Math.floor(
		(athlete.state.power / athlete.athlete.ftp * 100 - 45) / 15 * (100/6)
		);
	if (zonePCT < 0) zonePCT = 5;
	if (zonePCT > 100) zonePCT = 100;
	$('#current-hr').html(athlete.state.heartrate);
	$('#powerzone .track').animate({'width': zonePCT + '%'}, 2700);
}


async function populateLeaderboard(){
	if (sandbox) {
		//or get random nearby IDs 
		const response = await fetch('../../../../api/nearby/v1');
		let neighborData = await response.json();
		teamData.raw = neighborData.slice(10, 10+teamData.team.length);
		for (i in teamData.raw) {
			teamData.team[i].zid = teamData.raw[i].athleteId;
		  teamData.team[i].name = teamData.raw[i].athlete.fullname.slice(0, 20);

		}
	}

	for (i in teamData.team) {
		let rider = teamData.team[i];
		let riderLine = $("<li data-zid='"+rider.zid+"' data-gap='0'><span class='rider-name'>"+rider.name+
			"</span> <span class='monotime'>--:--</span></li>");
		$('#roster ul').append(riderLine);

	}

}

function updateDisplay(){

	let riderLines = [];

	for (i in teamData.team) {
			
			let rider = teamData.team[i];
			fetch('../../../../api/athlete/stats/v1/' + rider.zid)
			    .then((response) => response.json())
			    .then((json) => {
			    	let riderLine = $("li[data-zid='"+rider.zid+"']").first();
			    	let gap = toHoursAndMinutes(json.gap);
			    	riderLine.attr("data-gap", json.gap);
			    	riderLine.children('.monotime').html(gap.m + ":" + gap.s.toString().padStart(2,0));
			    	
					riderLine.children('.rider-name').html(rider.name);
			    });

	}

	sortRoster();
					
}

function sortRoster() {
	$('#roster li').each(function(index) {
		if ($(this).attr('data-gap') < $(this).next().attr('data-gap')) {
			swapLines($(this), $(this).next());
		}
	});
}

function swapLines(firstLine, secondLine) {
	console.log("swapping...");

	moveUp = secondLine.innerHeight();
	$(secondLine).animate({'top':  -moveUp + "px"},900);
	$(firstLine).animate({'top': moveUp + "px"},900, function(){ 

			$(firstLine).before($(secondLine));
			$('#roster li').css({'top': '0'});
		});
}

populateLeaderboard();

setInterval(setupSelf, 3000);
setInterval(updateDisplay, 1000);
//updateDisplay();	
});


