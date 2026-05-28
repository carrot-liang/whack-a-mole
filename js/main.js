$(function() {
	function updateRootFontSize() {
		var viewportWidth = Math.min(screen.width, document.documentElement.getBoundingClientRect().width);
		document.documentElement.style.fontSize = viewportWidth / 750 * 32 + 'px';
	}

	window.addEventListener('resize', updateRootFontSize);
	updateRootFontSize();
});

var gameDurationSeconds = 30;
var score = 0;
var spawnTimer = null;
var effectAudioIndex = 0;
var spawnIntervalMs = getRandomInteger(800, 1100);
var targetStayMs = getRandomInteger(700, 950);
var rankingStorageKey = 'whackAMoleRankings';

var targetPositions = [{
		left: "2.25rem",
		top: "10.9375rem"
	},
	{
		left: "9.0625rem",
		top: "9.4375rem"
	},
	{
		left: "15.125rem",
		top: "11.625rem"
	},
	{
		left: "2.25rem",
		top: "17.75rem"
	},
	{
		left: "9.1875rem",
		top: "16.3125rem"
	},
	{
		left: "15.125rem",
		top: "18.5rem"
	},
	{
		left: "2.125rem",
		top: "27rem"
	},
	{
		left: "8.875rem",
		top: "25.4375rem"
	},
	{
		left: "15.125rem",
		top: "27.625rem"
	}
];

var targetConfigs = [{
		type: 'wolffy',
		normal: 'image/wolffy.png',
		hit: 'image/wolffy-hit.png',
		offsetLeft: -0.45,
		offsetTop: -1.2,
		spawnWeight: 7,
		scoreDelta: 10,
		hitAudio: 'hit-right'
	},
	{
		type: 'howie',
		normal: 'image/howie.png',
		hit: 'image/howie-hit.png',
		offsetLeft: -0.45,
		offsetTop: -1.2,
		spawnWeight: 3,
		scoreDelta: -10,
		hitAudio: 'hit-wrong'
	},
	{
		type: 'mole',
		normal: 'image/mole.png',
		hit: 'image/mole-hit.png',
		offsetLeft: -0.45,
		offsetTop: -1.2,
		spawnWeight: 5,
		scoreDelta: 10,
		hitAudio: 'hit-right'
	}
];

function getRandomInteger(min, max) {
	return Math.round(Math.random() * (max - min) + min);
}

function getOffsetPosition(positionValue, offsetRem) {
	return 'calc(' + positionValue + ' + ' + offsetRem + 'rem)';
}

function getRandomTargetConfig() {
	var totalWeight = targetConfigs.reduce(function(total, targetConfig) {
		return total + targetConfig.spawnWeight;
	}, 0);
	var randomWeight = Math.random() * totalWeight;

	for (var index = 0; index < targetConfigs.length; index++) {
		randomWeight -= targetConfigs[index].spawnWeight;

		if (randomWeight <= 0) {
			return targetConfigs[index];
		}
	}

	return targetConfigs[targetConfigs.length - 1];
}

function setScore(nextScore) {
	score = Math.max(nextScore, 0);
	$(".score-num").text(score);
	renderCurrentRank();
}

function padTimeUnit(value) {
	return value < 10 ? '0' + value : String(value);
}

function formatDateTime(date) {
	return date.getFullYear() + '-' +
		padTimeUnit(date.getMonth() + 1) + '-' +
		padTimeUnit(date.getDate()) + ' ' +
		padTimeUnit(date.getHours()) + ':' +
		padTimeUnit(date.getMinutes()) + ':' +
		padTimeUnit(date.getSeconds());
}

function getRankingRecords() {
	var records = [];

	try {
		records = JSON.parse(localStorage.getItem(rankingStorageKey)) || [];
	} catch (error) {
		records = [];
	}

	return records;
}

function saveRankingRecords(records) {
	localStorage.setItem(rankingStorageKey, JSON.stringify(records));
}

function clearRankingRecords() {
	if (!window.confirm('确定要清除全部榜单数据吗？')) {
		return;
	}

	localStorage.removeItem(rankingStorageKey);
	renderRankingTable();
	renderGameResult(null);
}

function sortRankingRecords(records) {
	return records.sort(function(firstRecord, secondRecord) {
		if (secondRecord.score !== firstRecord.score) {
			return secondRecord.score - firstRecord.score;
		}

		return secondRecord.timestamp - firstRecord.timestamp;
	});
}

function renderRankingTable() {
	var records = sortRankingRecords(getRankingRecords());
	var rankingRowsHtml = '';

	renderParticipantCount(records);
	renderCurrentRank(records);
	renderTopRankingList(records);

	if (records.length === 0) {
		$("#ranking-table-body").html('<tr><td colspan="4" class="empty-ranking-cell">暂无记录</td></tr>');
		return;
	}

	records.forEach(function(record, index) {
		rankingRowsHtml += '<tr>' +
			'<td><span class="ranking-index">' + (index + 1) + '</span></td>' +
			'<td class="ranking-player-id">#' + record.playerId + '</td>' +
			'<td class="ranking-score">' + record.score + '</td>' +
			'<td class="ranking-time">' + formatRankingTime(record.time) + '</td>' +
			'</tr>';
	});

	$("#ranking-table-body").html(rankingRowsHtml);
}

function renderParticipantCount(records) {
	$("#participant-count").text(records.length);
}

function formatRankingTime(timeText) {
	var timeParts = String(timeText).split(' ');

	if (timeParts.length !== 2) {
		return timeText;
	}

	return '<span>' + timeParts[0] + '</span><span>' + timeParts[1] + '</span>';
}

function renderCurrentRank(records) {
	var sortedRecords = records || sortRankingRecords(getRankingRecords());
	var rank = sortedRecords.filter(function(record) {
		return record.score > score;
	}).length + 1;

	$(".rank-num").text(rank);
}

function renderTopRankingList(records) {
	var topRankingHtml = '';
	var topRecords = records.slice(0, 3);

	for (var index = 0; index < 3; index++) {
		var rank = index + 1;
		var record = topRecords[index];
		var rankingDetailHtml = record ?
			'<span class="top-ranking-player">#' + record.playerId + '</span>' +
			'<span class="top-ranking-score">' + record.score + ' 分</span>' :
			'<span class="top-ranking-empty">暂无记录</span>';

		topRankingHtml += '<li>' +
			'<img class="top-ranking-trophy" src="image/trophy-' + rank + '.png" alt="第' + rank + '名">' +
			rankingDetailHtml +
			'</li>';
	}

	$("#top-ranking-list").html(topRankingHtml);
}

function createRankingRecord(finalScore) {
	var now = new Date();

	return {
		playerId: String(getRandomInteger(10000, 99999)),
		score: Number(finalScore),
		time: formatDateTime(now),
		timestamp: now.getTime()
	};
}

function addRankingRecord(finalScore) {
	var records = getRankingRecords();
	var rankingRecord = createRankingRecord(finalScore);
	var rankingIndex = 0;

	records.push(rankingRecord);
	records = sortRankingRecords(records);
	rankingIndex = records.indexOf(rankingRecord);
	saveRankingRecords(records);
	renderRankingTable();

	return {
		record: rankingRecord,
		rank: rankingIndex + 1
	};
}

function renderGameResult(result) {
	if (!result) {
		$(".game-result-panel").hide();
		$("#game-result-content").empty();
		return;
	}

	$("#game-result-content").html('<strong>#' + result.record.playerId +
		'</strong>，得分 <strong>' + result.record.score +
		'</strong>，排名 <strong>' + result.rank +
		'</strong><br>' + result.record.time);
	$(".game-result-panel").show();
}

function finishGame() {
	var finalScore = score;
	var result = addRankingRecord(finalScore);

	$(".target-hole").remove();
	$(".time-num").text(gameDurationSeconds);
	$(".game-header").hide();
	$(".start-box").show();
	renderGameResult(result);

	if (result.rank <= 3) {
		playEffectAudio('top-rank');
	} else {
		playEffectAudio('game-over');
	}
}

function playEffectAudio(audioName) {
	if (!isMusicEnabled()) {
		stopEffectAudio();
		return;
	}

	effectAudioIndex++;

	var audioHtml = '<audio class="effect-audio" id="effect-audio-' + effectAudioIndex +
		'" preload="auto"><source src="audio/' + audioName + '.ogg" type="audio/ogg"></audio>';

	$("body").append(audioHtml);
	$('#effect-audio-' + effectAudioIndex)[0].play();

	$(".effect-audio").each(function() {
		if (this.paused) {
			this.remove();
		}
	});
}

function stopEffectAudio() {
	$(".effect-audio").each(function() {
		this.pause();
		this.remove();
	});
}

function startCountdown(secondsRemaining) {
	var countdownTimer = window.setInterval(function() {
		var second = Math.max(Math.floor(secondsRemaining), 0);
		var formattedSecond = second <= 9 ? '0' + second : second;

		$(".time-num").text(formattedSecond);
		secondsRemaining--;

		if (second === 0) {
			clearInterval(countdownTimer);
			clearInterval(spawnTimer);

			setTimeout(function() {
				finishGame();
			}, 500);
		}
	}, 1000);
}

function isMusicEnabled() {
	return $("#music-button").hasClass("is-music-on");
}

function toggleBackgroundMusic() {
	var $musicButton = $("#music-button");
	var backgroundAudio = $("#game-bg-audio")[0];

	if (isMusicEnabled()) {
		$musicButton.removeClass("is-music-on");
		backgroundAudio.pause();
		stopEffectAudio();
	} else {
		$musicButton.addClass("is-music-on");
		backgroundAudio.play();
	}
}

function startGame() {
	if (isMusicEnabled()) {
		$("#game-bg-audio")[0].play();
	}

	playEffectAudio('game-start');
	$(".game-header").show();
	$(".start-box").hide();

	setScore(0);
	startCountdown(gameDurationSeconds);
	startSpawnLoop();
}

function startSpawnLoop() {
	spawnTimer = setInterval(function() {
		spawnTarget();
	}, spawnIntervalMs);
}

function showScoreFeedback(targetHole, scoreDelta) {
	var scoreFeedback = document.createElement('span');

	scoreFeedback.className = 'score-feedback ' + (scoreDelta > 0 ? 'is-positive' : 'is-negative');
	scoreFeedback.textContent = (scoreDelta > 0 ? '+' : '') + scoreDelta;
	targetHole.appendChild(scoreFeedback);

	setTimeout(function() {
		scoreFeedback.remove();
	}, 650);
}

function spawnTarget() {
	var targetHole = document.createElement('div');
	var targetImage = document.createElement('img');
	var positionIndex = getRandomInteger(0, targetPositions.length - 1);
	var targetConfig = getRandomTargetConfig();
	var clickCount = 0;

	targetHole.className = 'target-hole';
	targetImage.className = 'target-image is-appearing';
	targetImage.src = targetConfig.normal;
	targetImage.alt = targetConfig.type;
	targetHole.appendChild(targetImage);
	$(".game-box-bg").append(targetHole);

	targetHole.style.left = getOffsetPosition(targetPositions[positionIndex].left, targetConfig.offsetLeft);
	targetHole.style.top = getOffsetPosition(targetPositions[positionIndex].top, targetConfig.offsetTop);

	setTimeout(function() {
		targetImage.classList.remove('is-appearing');
	}, 220);

	targetHole.onclick = function() {
		clickCount++;

		if (clickCount > 1) {
			return false;
		}

		targetImage.src = targetConfig.hit;
		targetImage.classList.add('is-hit');
		showScoreFeedback(targetHole, targetConfig.scoreDelta);
		setScore(score + targetConfig.scoreDelta);
		playEffectAudio(targetConfig.hitAudio);
	};

	setTimeout(function() {
		targetImage.classList.add('is-hiding');

		setTimeout(function() {
			targetHole.remove();
		}, 260);
	}, targetStayMs);
}

$("#music-button").on("click", toggleBackgroundMusic);
$(".start-button").on("click", startGame);
$(".clear-ranking-button").on("click", clearRankingRecords);
renderRankingTable();
