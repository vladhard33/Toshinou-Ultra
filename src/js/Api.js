class Api {
	constructor() {
		this._blackListedBoxes = [];
		this._blackListedNpcs = [];
		this.gates = [];
		this.boxes = {};
		this.ships = {};
		this.battlestation = null;
		this.startTime = null;
		this.lastMovement = 0;
		this.isDisconnected = false;
		this.disconnectTime = null;
		this.reconnectTime = null;
		this.jumpTime = $.now();
		this.resetBlackListTime = $.now();
		this.blackListTimeOut = 150000
		this.rute = null;
		this.starSystem = [];
		this.workmap = null;
		this.jumped = false;
		this.changeConfigTime = $.now();
		this.changeFormationTime = $.now();
		this.lastAutoLock = $.now();
		this.autoLocked = false;
		this.runDelay = -1;
		// pet stuff
		this.currentModule = null;
		this.petDead = false;
		this.petActivateTimer = -1;
		this.moduleCooldown = -1;
		this.petHasFuel = true;
		// QuickSlot stuff
		this.abilityCoolDown = 1;
		this.formation = -1;
		this.pauseTime = null;
		this.pauseStop = null;
	}

	changePetModule(module_id){
		if(this.currentModule != module_id){
			Injector.injectScript('document.getElementById("preloader").petModule(parseInt('+module_id+'), "");');
			this.currentModule = module_id;
		}
	}

	callPet(n){
		// 0 = activate
		// 1 = deactivate
		// 4 = repair
		api.petActivateTimer = $.now();
		Injector.injectScript('document.getElementById("preloader").petCall('+parseInt(n)+');');
		this.currentModule = -1;
	}

	pause(t){
		window.settings.settings.pause = true;
		this.pauseTime = $.now();
		this.pauseStop = t;
	}
	combatMode(){
		if (window.settings.settings.autoChangeConfig && window.settings.settings.attackConfig != window.hero.shipconfig){
			api.changeConfig();
		}
		if (window.settings.settings.changeFormation && !api.isRepairing){
			if (window.settings.settings.attackFormation != api.formation) {
				api.changeFormation(window.settings.settings.attackFormation);
			}
		}
	}

	flyingMode(){
		if (window.settings.settings.autoChangeConfig && window.settings.settings.flyingConfig != window.hero.shipconfig) {
			api.changeConfig();
		}
		if (window.settings.settings.changeFormation && api.formation != window.settings.settings.flyingFormation) {
			api.changeFormation(window.settings.settings.flyingFormation);
		}
	}

	useAbility(){
		var cooldownlist = {"cyborg":310000,"solace":140000,"diminisher":161000,"venom":180000,"sentinel":215000,"spectrum":195000,"v-lightning":185000};
		if(this.abilityCoolDown && $.now() - this.abilityCoolDown > cooldownlist[window.hero.skillName]){
			this.quickSlot(window.settings.settings.abilitySlot);
			this.abilityCoolDown = $.now();
			return true;
		}
		return false;
	}

	getShipName(fullname){
		let namelist = /ship_(.*?)(_|$)/g;
		let rname = namelist.exec(fullname);
		if(rname != null){
			return rname[1]
		}else{
			return false;
		}
	}

	changeFormation(n){
		if (this.changeFormationTime && $.now() - this.changeFormationTime > 3000){
			this.changeFormationTime = $.now();
			this.formation = n;
			this.quickSlot(n);
		}
	}
	
	quickSlot(n){
		if(n>=0 && n< 10){
			let slots = [48,49,50,51,52,53,54,55,56,57];
			Injector.injectScript('document.getElementById("preloader").pressKey('+slots[n]+');');
			setTimeout(() => {
				Injector.injectScript('document.getElementById("preloader").pressKey('+slots[n]+');');
			}, 700);
		}
	}
  
	changeRefreshCount(n){
		chrome.storage.local.set({"refreshCount": n});
	}

	isShipOnBlacklist(id) {
		return this._blackListedNpcs.includes(id);
	}

	blackListId(id) {
		this._blackListedNpcs.push(id);
		setTimeout(() => {
			this._blackListedNpcs.shift();
		}, 120000);
	}

	lockShip(ship) {
		if (!(ship instanceof Ship))
		return;

		if (this.ships[ship.id] == null)
		return;

		ship.update();
		let pos = ship.position;
		let scr = 'document.getElementById("preloader").lockShip(' + ship.id + ',' + Math.round(pos.x) + ',' + Math.round(pos.y) + ',' + Math.round(window.hero.position.x) + ',' + Math.round(window.hero.position.y) + ');';
		Injector.injectScript(scr);

		this.lockTime = $.now();
	}

	lockNpc(ship) {
		if (!(ship instanceof Ship))
			return;

		if (this.ships[ship.id] == null)
			return;

		this.lockTime = $.now();

		this.lockShip(ship);
	}

	reconnect() {
		Injector.injectScript('document.getElementById("preloader").reconnect();');
		this.reconnectTime = $.now();
	}

	collectBox(box) {
		if (!(box instanceof Box))
			return;

		if (this.boxes[box.hash] == null)
			return;

		if (MathUtils.random(1, 100) >= window.settings.settings.collectionSensitivity) {
			return;
		}

		Injector.injectScript('document.getElementById("preloader").collectBox' + box.hash + '()');

		this.collectTime = $.now();
	}

	move(x, y) {
		if (!isNaN(x) && !isNaN(y)) {
			if(window.invertedMovement){
				x = x + ((window.hero.position.x - x)*2);
				y = y + ((window.hero.position.y - y)*2);
			}
			window.hero.move(new Vector2D(x, y));
		}
	}

	blackListHash(hash) {
		this._blackListedBoxes.push(hash);
	}

	isOnBlacklist(hash) {
		return this._blackListedBoxes.includes(hash);
	}

	startLaserAttack() {
		Injector.injectScript('document.getElementById("preloader").laserAttack()');
	}

	jumpGate() {
		Injector.injectScript('document.getElementById("preloader").jumpGate();');
	}

	changeConfig() {
		if (this.changeConfigTime && $.now() - this.changeConfigTime > 5000) {
			this.changeConfigTime = $.now();
			Injector.injectScript('document.getElementById("preloader").changeConfig();');
		}
	}


	resetTarget(target) {
		switch(target){
			case "enemy":
				this.targetShip = null;
				this.attacking = false;
				this.triedToLock = false;
				this.lockedShip = null;
				break;
			case "box":
				this.targetBoxHash = null;

				break;
			case "all":
				this.targetShip = null;
				this.attacking = false;
				this.triedToLock = false;
				this.lockedShip = null;
				this.targetBoxHash = null;
				break;
			default:
				break;
		}
	}

	jumpInGG(id, settings) { //Usage: api.jumpInGG(70, window.settings.settings.kappa);
		if (settings) {
			let gate = this.findNearestGatebyGateType(id);
			if (gate.gate) {
				let x = gate.gate.position.x;
				let y = gate.gate.position.y;
				if (window.hero.position.distanceTo(gate.gate.position) < 200 && this.jumpTime && $.now() - this.jumpTime > 3000) {
					this.jumpGate();
					this.jumpTime = $.now();
				}
				this.resetTarget("all");
				this.move(x, y);
				window.movementDone = false;
			}
		}
	}

	jumpInGateByID(gateId){
		let hasJumped = false;
		let gate = this.findGatebyID(gateId);
		if (!this.jumped && gate.gate && this.jumpTime && $.now() - this.jumpTime > 5500) {
			let x = gate.gate.position.x + MathUtils.random(-100, 100);
			let y = gate.gate.position.y + MathUtils.random(-100, 100);
			if (window.hero.position.distanceTo(gate.gate.position) < 200) {
				this.jumpGate();
				hasJumped = true;
			}
			this.resetTarget("all");
			this.move(x, y);
			window.movementDone = false;
		}
		return hasJumped;
	}

	jumpAndGoBack(gateId){
		if (window.settings.settings.workmap != null) 
			this.workmap = window.settings.settings.workmap;
		else 
			this.workmap = window.hero.mapId;
		let hasJumped = this.jumpInGateByID(gateId);
		return hasJumped;
	}

	ggDeltaFix() {
		let shipsCount = Object.keys(this.ships).length;
		for (let property in this.ships) {
			let ship = this.ships[property];
			if (ship && (ship.name == "-=[ StreuneR ]=- δ4" || 
				ship.name == "-=[ Lordakium ]=- δ9" || 
				ship.name == "-=[ Sibelon ]=- δ14" || 
				ship.name == "-=[ Kristallon ]=- δ19")) {
				window.settings.settings.resetTargetWhenHpBelow25Percent=false;
				if (shipsCount > 1) {
					window.settings.setNpc(ship.name, true);
					if (this.targetShip == ship){
						this.resetTarget("enemy");
					}
				} else {
					window.settings.setNpc(ship.name, false);
					this.targetShip = ship;
				}
			}
		}
	}

	ggZetaFix() {
		let shipsCount = Object.keys(this.ships).length;
		for (let property in this.ships) {
			let ship = this.ships[property];
			if (ship && (ship.name == "-=[ Devourer ]=- ζ25" || ship.name == "-=[ Devourer ]=- ζ27")) {
				window.settings.settings.resetTargetWhenHpBelow25Percent=false;
				if (shipsCount > 1) {
					window.settings.setNpc(ship.name, true);
					if (this.targetShip == ship) {
						this.resetTarget("enemy");
					}
				} else {
					window.settings.setNpc(ship.name, false);
					this.targetShip = ship;
				}
			}
		}
	}

	battlerayFix() {
		for (let property in this.ships) {
			let ship = this.ships[property];
			if (ship && (ship.name == "-=[ Battleray ]=-") && ship.distanceTo(window.hero.position) < 700) {
				let shipsCount = this.countNpcAroundByType("-=[ Interceptor ]=-", 600);
				if (shipsCount > 1 && !(lockedShip && lockedShip.percentOfHp > 80 && lockedShip.name == "-=[ Battleray ]=-")) {
					window.settings.setNpc(ship.name, true);
					if (this.targetShip == ship){
						this.resetTarget("enemy");
					}
				} else {
					window.settings.setNpc(ship.name, false);
					this.targetShip = ship;
				}
			}
		}
	}

	countNpcAroundByType(type, distance){
		let shipsCount = Object.keys(this.ships).length;
		let shipsAround = 0;
		for (let property in this.ships) {
			let ship = this.ships[property];
			if (ship && (ship.distanceTo(window.hero.position) < distance) && (ship.name == type)) {
				shipsAround++;
			}
		}
		return shipsAround;
	}

	allNPCInCorner(){
		let shipsCount = Object.keys(this.ships).length;
		let shipsInCorner = 0;
		for (let property in this.ships) {
			let ship = this.ships[property];
			if((ship.position.x == 20999 && ship.position.y == 13499) || (ship.position.x == 0 && ship.position.y == 0)) {
				shipsInCorner++;
			}
		}
		
		if(shipsInCorner == shipsCount){
			return true;
		}else{
			return false;
		}
	}

	findNearestBox() {
		let minDist = 100000;
		let finalBox;

		if (!window.settings.settings.bonusBox && !window.settings.settings.materials &&
			!window.settings.settings.palladium && !window.settings.settings.cargoBox &&
			!window.settings.settings.greenOrGoldBooty && !window.settings.settings.redBooty &&
			!window.settings.settings.blueBooty && !window.settings.settings.masqueBooty) {
			return {
				box: null,
				distance: minDist
			};
		}

		for (let property in this.boxes) {
			let box = this.boxes[property];
			let dist = box.distanceTo(window.hero.position);
			if (dist < minDist) {
				if (!box.isResource() && ((box.isCollectable() && window.settings.settings.bonusBox) ||
					((box.isMaterial() || box.isDropRes()) && window.settings.settings.materials) ||
					(box.isPalladium() && window.settings.settings.palladium) ||
					(box.isCargoBox() && window.settings.settings.cargoBox) ||
					(box.isGreenOrGoldBooty() && window.settings.settings.greenOrGoldBooty && window.greenOrGoldBootyKeyCount > 0) ||
					(box.isRedBooty() && window.settings.settings.redBooty && window.redBootyKeyCount > 0) ||
					(box.isBlueBooty() && window.settings.settings.blueBooty && window.blueBootyKeyCount > 0) ||
					(box.isMasqueBooty() && window.settings.settings.masqueBooty && window.masqueBootyKeyCount > 0))) {
				finalBox = box;
				minDist = dist;
				}
			}
		}
		return {
		box: finalBox,
		distance: minDist
		};
	}
	

	findNearestShip() {
		let minDist = window.settings.settings.palladium ? window.settings.settings.npcCircleRadius : 100000;
		let finalShip;

		if (!window.settings.settings.killNpcs) {
			return {
				ship: null,
				distance: minDist
			};
		}

		for (let property in this.ships) {
			let ship = this.ships[property];
			ship.update();
			let dist = ship.distanceTo(window.hero.position);

			if (dist < minDist) {
				if (ship.isNpc && window.settings.getNpc(ship.name) && !this.isShipOnBlacklist(ship.id) && !ship.isAttacked) {
					finalShip = ship;
					minDist = dist;
				}
			}
		}

		return {
		ship: finalShip,
		distance: minDist
		};
	}

	findNearestGate() {
		let minDist = 100000;
		let finalGate;

		this.gates.forEach(gate => {
			if(gate.gateId != 150000409 && gate.gateId != 150000410 && gate.gateId != 150000411){
				let dist = window.hero.distanceTo(gate.position);
				if (dist < minDist) {
					finalGate = gate;
					minDist = dist;
				}
			}
		});

		return {
			gate: finalGate,
			distance: minDist
		};
	}
	
	  findNearestGateForRunAway(enemy) {
		let minDist = 100000;
		let finalGate;
		this.gates.forEach(gate => {
			if(gate.gateId != 150000409 && gate.gateId != 150000410 && gate.gateId != 150000411){
				let enemeyDistance = enemy.distanceTo(gate.position);
				let dist = window.hero.distanceTo(gate.position);
				if (enemeyDistance < dist) {
					return;
				}
			
				if (dist < minDist) {
					finalGate = gate;
					minDist = dist;
				}
			}
		});
	
		return {
		  gate: finalGate,
		  distance: minDist
		};
	}

	fleeFromEnemy(enemy) {
		let gate = this.findNearestGateForRunAway(enemy);
		if(gate.gate){
			let dist = window.hero.distanceTo(gate.gate.position);
            if (window.settings.settings.useAbility && dist > 350 &&
                (window.hero.skillName == "spectrum" ||
                    window.hero.skillName == "sentinel" ||
                    window.hero.skillName == "v-lightning" )) {

                let hpPercent = MathUtils.percentFrom(window.hero.hp, window.hero.maxHp);
                let shdPercent = MathUtils.percentFrom(window.hero.shd, window.hero.maxShd);
                // Excludes shield factor if there's no shield on the configuration
                if (isNaN(shdPercent))
                    shdPercent = 100;
                if (Math.min(hpPercent, shdPercent) < window.settings.settings.repairWhenHpIsLowerThanPercent)
                    api.useAbility();
            }
			if(window.settings.settings.jumpFromEnemy && !window.stayInPortal){
				if (this.jumpAndGoBack(gate.gate.gateId)) {
					this.runDelay = $.now();
					window.stayInPortal = true;
					window.movementDone = false;
					window.fleeingFromEnemy = false;
					return;
				}
			}
			this.resetTarget("all");
			if(dist > 200 ){
				let x = gate.gate.position.x + MathUtils.random(-100, 100);
				let y = gate.gate.position.y + MathUtils.random(-100, 100);
				this.move(x, y);
			}else if($.now() - this.runDelay > 30000){
				this.runDelay = $.now();
				window.fleeFromEnemy = false;
			}
		}
	}

	findNearestGatebyGateType(gateId) {
		let minDist = 100000;
		let finalGate;

		this.gates.forEach(gate => {
			let dist = window.hero.distanceTo(gate.position);
			if (dist < minDist && gate.gateType == gateId) {
				finalGate = gate;
				minDist = dist;
			}
		});

		return {
		gate: finalGate,
		distance: minDist
		};
	}

	findNearestGatebyGateType(gateId) {
		let minDist = 100000;
		let finalGate;

		this.gates.forEach(gate => {
			let dist = window.hero.distanceTo(gate.position);
			if (dist < minDist && gate.gateType == gateId) {
				finalGate = gate;
				minDist = dist;
			}
		});

		return {
		gate: finalGate,
		distance: minDist
		};
	}

	markHeroAsDead() {
		this.heroDied = true;
		window.fleeingFromEnemy = false;
		Injector.injectScript("window.heroDied = true;");
	}

	checkForCBS(){
		let result = {
			walkAway: false,
			cbsPos: null,
		};
		result.cbsPos = this.battlestation.position;
		let dist = this.battlestation.distanceTo(window.hero.position);
		if(dist < 1500){
			result.walkAway = true;
		}
		return result;
	}
	
	checkForEnemy() {
		let result = {
			run: false,
			enemy: null,
			edist: 100000
		};
		let enemyDistance = 100000;
		let enemyShip;
		for (let property in this.ships) {
		let ship = this.ships[property];
		ship.update();
		if (!ship.isNpc && ship.isEnemy) {
			let dist = ship.distanceTo(window.hero.position);
			if (enemyDistance > dist) {
				enemyDistance = dist;
				result.edist = dist;
				result.enemy = ship;
			}
		}
		}
		if (enemyDistance < 2000) {
			result.run = true;
			return result;
		}
		return result;
	}

	findGatebyID(gateId) {
		let finalGate;

		this.gates.forEach(gate => {
		if (gate.gateId == gateId) {
			finalGate = gate;
		}
		});

		return {
			gate: finalGate,
		};
	}

	goToMap(idWorkMap){
		if(this.rute == null){
			this.fillStarSystem();
			let mapSystem = {1:{2:1},2:{1:1,3:1,4:1},3:{2:1,7:1,4:1},4:{2:1,3:1,13:2,13:1},13:{4:1,14:2,15:2,16:2},5:{6:1},6:{5:1,7:1,8:1},7:{6:1,3:1,8:1},8:{6:1,7:1,14:2,11:1},14:{8:1,13:2,15:2,16:2},9:{10:1},10:{9:1,12:1,11:1},
			11:{10:1,8:1,12:1},12:{10:1,11:1,15:2,4:1},15:{12:1,14:2,13:2,16:2},16:{13:2,14:2,15:2,17:1,21:1,25:1},29:{17:1,21:1,25:1},17:{16:2,29:3,19:1,18:1},18:{17:1,20:1},19:{17:1,20:1},20:{18:1,19:1},21:{16:2,29:3,22:1,23:1},22:{21:1,24:1},23:{21:1,24:1},24:{23:1,22:1},25:{29:3,16:2,27:1,26:1},27:{25:1,28:1},26:{25:1,28:1},28:{26:1,27:1}},
			graph = new Graph(mapSystem);
			let imcompleteRute = graph.findShortestPath(window.hero.mapId, idWorkMap);
			this.rute = this.completeRute(imcompleteRute);
		}else{
			let map = this.rute[0];
			let portal = map.portals[0];
			if(window.hero.mapId == map.mapId){
				if(!this.jumpInGateByID(portal.gateId))
					this.rute = null;
			}
			if(window.hero.mapId == portal.idLinkedMap){
				this.rute.shift();
			}
		}
	}

	fillStarSystem(){
		this.starSystem = [];
		let portals11 = [];
		portals11.push(new Portal(150000156,2));
		this.starSystem.push(new Map(1, portals11));
		let portals12 = [];
		portals12.push(new Portal(150000157,1));
		portals12.push(new Portal(150000158,3));
		portals12.push(new Portal(150000160,4));
		this.starSystem.push(new Map(2, portals12));
		let portals13 = [];
		portals13.push(new Portal(150000159,2));
		portals13.push(new Portal(150000182,4));
		portals13.push(new Portal(150000162,7));
		this.starSystem.push(new Map(3, portals13));
		let portals14 = [];
		portals14.push(new Portal(150000161,2));
		portals14.push(new Portal(150000183,3));
		portals14.push(new Portal(150000186,13));
		portals14.push(new Portal(150000166,12));
		this.starSystem.push(new Map(4, portals14));
		let portals21 = [];
		portals21.push(new Portal(150000171,6)); //2-1 | 2-2
		this.starSystem.push(new Map(5, portals21));
		let portals22 = [];
		portals22.push(new Portal(150000165,7)); //2-2 | 2-3
		portals22.push(new Portal(150000172,8)); //2-2 | 2-4
		portals22.push(new Portal(150000170,5)); //2-2 | 2-4
		this.starSystem.push(new Map(6, portals22));
		let portals23 = [];
		portals23.push(new Portal(150000163,3)); //2-3 | 1-3
		portals23.push(new Portal(150000180,8)); //2-3 | 2-4
		portals23.push(new Portal(150000164,6)); //2-3 | 2-2
		this.starSystem.push(new Map(7, portals23));
		let portals24 = [];
		portals24.push(new Portal(150000181,7)); //2-4 | 2-3
		portals24.push(new Portal(150000188,14)); //2-4 | 4-2
		portals24.push(new Portal(150000173,6)); //2-4 | 2-2
		portals24.push(new Portal(150000174,11)); //2-4 | 3-3
		this.starSystem.push(new Map(8, portals24));
		let portals31 = [];
		portals31.push(new Portal(150000179,10)); //3-1 | 3-2
		this.starSystem.push(new Map(9, portals31));
		let portals32 = [];
		portals32.push(new Portal(150000177,11)); //3-2 | 3-3
		portals32.push(new Portal(150000169,12)); //3-2 | 3-4
		portals32.push(new Portal(150000178,9)); //3-2 | 3-1
		this.starSystem.push(new Map(10, portals32));
		let portals33 = [];
		portals33.push(new Portal(150000175,8)); //3-3 | 2-4
		portals33.push(new Portal(150000185,12)); //3-3 | 3-4
		portals33.push(new Portal(150000176,10)); //3-3 | 3-2
		this.starSystem.push(new Map(11, portals33));
		let portals34 = [];
		portals34.push(new Portal(150000167,4));
		portals34.push(new Portal(150000190,15));
		portals34.push(new Portal(150000184,11));
		portals34.push(new Portal(150000168,10));
		this.starSystem.push(new Map(12, portals34));
		let portals43 = [];
		portals43.push(new Portal(150000191,12)); //4-3 | 3-4
		portals43.push(new Portal(150000195,14)); //4-3 | 4-2
		portals43.push(new Portal(150000196,13)); //4-3 | 4-1
		portals43.push(new Portal(150000278,16)); //4-3 | 4-4
		this.starSystem.push(new Map(15, portals43));
		let portals41 = [];
		portals41.push(new Portal(150000187,4)); //4-1 | 1-4
		portals41.push(new Portal(150000192,14)); //4-1 | 4-2
		portals41.push(new Portal(150000197,15)); //4-1 | 4-3
		portals41.push(new Portal(150000274,16)); //4-1 | 4-4
		this.starSystem.push(new Map(13, portals41));
		let portals42 = [];
		portals42.push(new Portal(150000189,8)); //4-2 | 2-4
		portals42.push(new Portal(150000193,13)); //4-2 | 4-1
		portals42.push(new Portal(150000194,15)); //4-2 | 4-3
		portals42.push(new Portal(150000276,16)); //4-2 | 4-4
		this.starSystem.push(new Map(14, portals42));
		let portals44 = [];
		portals44.push(new Portal(150000303,25)); //4-4 | 3-5
		portals44.push(new Portal(150000279,15)); //4-4 | 4-3
		portals44.push(new Portal(150000277,14)); //4-4 | 4-2
		portals44.push(new Portal(150000293,21)); //4-4 | 2-5
		portals44.push(new Portal(150000283,17)); //4-4 | 1-5
		portals44.push(new Portal(150000275,13)); //4-4 | 4-1
		this.starSystem.push(new Map(16, portals44));
		let portals45 = [];
		portals45.push(new Portal(150000314,17)); //4-5 | 1-5
		portals45.push(new Portal(150000316,21)); //4-5 | 2-5
		portals45.push(new Portal(150000318,25)); //4-5 | 3-5
		this.starSystem.push(new Map(29, portals45));
		let portals15 = [];
		portals15.push(new Portal(150000284,16)); //1-5 | 4-4
		portals15.push(new Portal(150000313,29)); //1-5 | 4-5
		portals15.push(new Portal(150000285,18)); //1-5 | 1-6
		portals15.push(new Portal(150000287,19)); //1-5 | 1-7
		this.starSystem.push(new Map(17, portals15));
		let portals16 = [];
		portals16.push(new Portal(150000286,17)); //1-6 | 1-5
		portals16.push(new Portal(150000289,20)); //1-6 | 1-8
		this.starSystem.push(new Map(18, portals16));
		let portals17 = [];
		portals17.push(new Portal(150000291,20)); //1-7 | 1-8
		portals17.push(new Portal(150000288,17)); //1-7 | 1-5
		this.starSystem.push(new Map(19, portals17));
		let portals18 = [];
		portals18.push(new Portal(150000290,18)); //1-8 | 1-6
		portals18.push(new Portal(150000292,19)); //1-8 | 1-7
		this.starSystem.push(new Map(20, portals18));
		let portals25 = [];
		portals25.push(new Portal(150000294,16)); //2-5 | 4-4
		portals25.push(new Portal(150000315,29)); //2-5 | 4-5
		portals25.push(new Portal(150000295,22)); //2-5 | 2-6
		portals25.push(new Portal(150000297,23)); //2-5 | 2-7
		this.starSystem.push(new Map(21, portals25));
		let portals26 = [];
		portals26.push(new Portal(150000296,21)); //2-6 | 2-5
		portals26.push(new Portal(150000299,24)); //2-6 | 2-8
		this.starSystem.push(new Map(22, portals26));
		let portals27 = [];
		portals27.push(new Portal(150000298,21)); //2-7 | 2-5
		portals27.push(new Portal(150000301,24)); //2-7 | 2-8
		this.starSystem.push(new Map(23, portals27));
		let portals28 = [];
		portals28.push(new Portal(150000300,22)); //2-8 | 2-6
		portals28.push(new Portal(150000302,23)); //2-8 | 2-7
		this.starSystem.push(new Map(24, portals28));
		let portals35 = [];
		portals35.push(new Portal(150000304,16)); //3-5 | 4-4
		portals35.push(new Portal(150000317,29)); //3-5 | 4-5
		portals35.push(new Portal(150000305,26)); //3-5 | 3-6
		portals35.push(new Portal(150000307,27)); //3-5 | 3-7
		this.starSystem.push(new Map(25, portals35));
		let portals36 = [];
		portals36.push(new Portal(150000306,25)); //3-6 | 3-5
		portals36.push(new Portal(150000309,28)); //3-6 | 3-8
		this.starSystem.push(new Map(26, portals36));
		let portals37 = [];
		portals37.push(new Portal(150000308,25)); //3-7 | 3-5
		portals37.push(new Portal(150000311,28)); //3-7 | 3-8
		this.starSystem.push(new Map(27, portals37));
		let portals38 = [];
		portals38.push(new Portal(150000312,27)); //3-8 | 3-7
		portals38.push(new Portal(150000310,26)); //3-8 | 3-6
		this.starSystem.push(new Map(28, portals38));
	}

	completeRute(imcompleteRute){
		let rute = [];
		for(let i = 0;i < imcompleteRute.length; i++){
			let idWorkMap = imcompleteRute[i];
			let nextMap = imcompleteRute[i + 1];
			for(let e = 0;e < this.starSystem.length;e++){
				if(this.starSystem[e].mapId == idWorkMap){
					let map = this.starSystem[e];
					let portalschosen = this.returnANextPortal(map.portals,nextMap);
					let arrayPortals = [];
					arrayPortals.push(portalschosen);
					rute.push(new Map(map.mapId,arrayPortals));
				}
			}
		}
		return rute;
	}

	returnANextPortal(portals,idGoMap){
		for(let i = 0;i < portals.length; i++){
			if(portals[i].idLinkedMap == idGoMap){
				return portals[i];
			}
		}
	}
}
