/* CONNECTION TO socket.io */
var socket = io.connect('http://localhost:1337');//Please modify the port if neccessary

/* BLOCK HTML */
var loginSection = document.getElementById("identification"),
    Parties = document.getElementById("Parties"),
    ListGame = document.getElementById("ListGame"),
    gameSection = document.getElementById("interface"),
    Lobby = document.getElementById("Lobby"),
    message = document.getElementById("message"),
    ZoneChat = document.getElementById("zone_chat"),
    PlayerList = document.getElementById("PlayerList"),
    teamA = document.getElementById("teamA"),
    teamB = document.getElementById("teamB"),
    ammu = document.getElementById("ammu"),
    PV = document.getElementById("PV"),
    infosPlayer = document.getElementById("infosPerso"),
    Ready = document.getElementById("btnRdy"),
    weaponName = document.getElementById("weaponName"),
    weaponSelection = document.getElementById("weaponSelection");

var canvas  = document.getElementById('canvas'),
    context = canvas.getContext("2d"),
    aimed = canvas.getContext("2d");

gameSection.style.display = "none";
Lobby.style.display = "none";
infosPlayer.style.display = "none";
weaponSelection.style.display = "none";


/*********** IDENTIFICATION ***********/

var player = new Player();;

/* WHEN A NEW CONNECTION IS DETECTED */
socket.on('newUser', function(pseudo) {
    $('#zone_chat').prepend('<p><em>' + pseudo + ' a rejoint le Chat !</em></p>');
});

/* VERIFY : LOGIN - PASSWORD */
function Connection(form){
    var identifer ={
        username : form.user.value,
        password : form.password.value
    };
    socket.emit('verifLogin', identifer);
    socket.on("identificationComplete", function(ID){
        document.title = identifer.username + ' - ' + document.title;
        gameSection.style.display = "block";
        loginSection.style.display = "none";
        player.ID = ID;
        player.pseudo = identifer.username;
        game.showList();
    });
    socket.on("identificationFail", function(pseudo){
        console.log("Connection failed");
    });
}
function Register(form){
    var identifer = {
        username : form.user.value,
        password :  form.password.value,
        passwordB :  form.passwordB.value
    };
    if(identifer.password == identifer.passwordB){
        socket.emit('Registration', identifer);
    }
    else{
        alert("Passwords does not correspond");
    }
}


/*********** GAME ***********/
var game = {
    start : false,
    showList : function(){
        socket.emit("qListGame", false);
    },
    new : function(){
        socket.emit("newGame", prompt("Name of the game :"));
        game.showList();
    },
    join : function(ID){
        var join={ID:ID,Player:player};
        player.game = ID;
        socket.emit("joinGame", join);
        Parties.style.display = "none";
        Lobby.style.display = "block";
        game.showLobby();
    },
    showLobby : function(){
        socket.emit("qlistPlayer", player.game);
    },
    exitGame : function(){
        socket.emit("exitGame", player);
        player.game = -1;
        player.team = 0;
        game.showList();
        Lobby.style.display = "none";
    },
    switchTeam : function(){
        socket.emit("switchTeam", player);
    },
    ready : function(){
        if(player.ready) player.ready = false;
        else player.ready = true;
        socket.emit("Ready", player.ready);
    }
    
};
//If the room is full (10/10)
socket.on("gameFull", function(){
    alert("Game full");
    game.exitGame();
});
socket.on("rListGame", function(listGame){ //Create a list of all the game
    Parties.style.display = "block";
    ListGame.innerHTML = "";
    for(i=0; i<listGame.length;i++){
        var li = document.createElement("li"),
            room = document.createElement("input");
        room.type = "button";
        room.name = "Game";
        room.value = listGame[i].name + " " + (listGame[i].listPlayer.length) +"/10";
        room.setAttribute('onclick',"game.join(" + i + ")")
        
        li.appendChild(room);
        ListGame.appendChild(li);
    }
});
//refresh team list
socket.on("RefreshTeamA", function(listPlayer){
    teamA.innerHTML ="";
    for(i=0;i<listPlayer.length;i++){
        if(listPlayer[i].pseudo==player.pseudo){
            player.team = 1;
            player.c = "blue";
        }
        var li = document.createElement("li");
        if(listPlayer[i].ready) li.className="isReady";
        else li.className="isNotReady";
        li.innerHTML = listPlayer[i].pseudo;
        teamA.appendChild(li);
    }
});
socket.on("RefreshTeamB", function(listPlayer){
    teamB.innerHTML ="";
    for(i=0;i<listPlayer.length;i++){
        if(listPlayer[i].pseudo==player.pseudo){
            player.team = 2;
            player.c = "red";
        }
        var li = document.createElement("li");
        if(listPlayer[i].ready) li.className="isReady";
        else li.className="isNotReady";
        li.innerHTML = listPlayer[i].pseudo;
        teamB.appendChild(li);
    }
});
//when everyone have click "ready"
socket.on("StartGame", function(){
    Lobby.style.display = "none";
    infosPlayer.style.display = "block";
    weaponSelection.style.display = "block";
    loop();
    game.start = true;
});

/*********** CHAT ***********/
function sendMessage(){
    var type = 0;
    if(player.game>=0) type = 1;
    else type = 0;
    socket.emit("newMsg", {pseudo : player.pseudo, message : message.value, type : type });
    message.value = ""; 
}
//validate msg with enter without refresh the page
function validateMsg(e){
    var key=e.keyCode || e.which;
  if (key==13){
     sendMessage();
  }
}
//When you received a message
socket.on("incomingMsg", function(data){
    var p = document.createElement("p");
    switch(parseInt(data.type)){
        case 0:
            p.className = "msgGeneral";
            break;
        case 1:
            p.className = "msgGame";
            break;
        case 2:
            p.className = "msgTeam";
            break;
        case 3:
            p.className = "msgPrivate";
            break;
    }
    p.innerHTML = "<span class='Pseudo'>" + data.pseudo + "</span> : " + data.message;
    ZoneChat.insertBefore(p, ZoneChat.childNodes[0]);
});










/*********** MECHANISM OF THE GAME ***********/
/* INITIALISATION */
var aim = {
        x:0,
        y:0
    },
    fire = false,
    cling = true,
    wait = 0,
    reloadTime = 0,
    canvasMulti = [canvas.getContext("2d"),canvas.getContext("2d"),canvas.getContext("2d"),canvas.getContext("2d"),canvas.getContext("2d"),canvas.getContext("2d"),canvas.getContext("2d"),canvas.getContext("2d"),canvas.getContext("2d"),canvas.getContext("2d")],
    each = [];

/* PLAYER INFORMATIONS */
function Player() {
    this.pseudo = "",
    this.ID = 0,
    this.game = -1,
    this.team = 0,
    this.ready = false,
    this.x = 0,
    this.y = 0,
    this.c = 'blue',
    this.pv = 100,
    this.isDead = false,
    this.bullets = [],
    this.angle = 0,
    this.weapon = 0,
    this.weaponB = 0,
    this.money = 8000,
    this.moveRight = function(){
        this.x += 2;
    }
    this.moveLeft = function(){
        this.x -= 2;
    }
    this.moveUp = function(){
        this.y -= 2;
    }
    this.moveDown = function(){
        this.y += 2;
    }
    this.reload = function(){
        reloadTime = this.weapon.reloadTime*2;
        this.weapon.ammu = this.weapon.ammu + this.weapon.reserve;
        if(this.weapon.ammu>this.weapon.capacity){
            this.weapon.reserve = this.weapon.ammu-this.weapon.capacity;
            this.weapon.ammu = this.weapon.capacity;
        }
        else{
            this.weapon.reserve = 0;
        }
        ammu.innerHTML = "Munitions : " + this.weapon.ammu + "/" + this.weapon.reserve;
    }
};

/* GESTION OF AIM */
/*var canvasX = canvas.offsetLeft;
var canvasY = canvas.offsetTop;*/
window.onmousemove = function(e){
    aim.x = e.clientX-canvas.offsetLeft;
    aim.y = e.clientY-canvas.offsetTop;
    player.angle = Math.atan2(aim.y-player.y, aim.x-player.x);
}

/* SHOTS GESTION */
// BULLETS MOVEMENTS
function update(){
    for(var i = 0; i < player.bullets.length; i++)
    {
        var bullet = player.bullets[i];
        bullet.x += Math.cos(bullet.angle)*20;
        bullet.y += Math.sin(bullet.angle)*20;
    }
    if(player.game>=0){
        socket.emit("newPos", {
        newX:player.x,
        newY:player.y,
        newC:player.c,
        newAngle:player.angle,
        newBullets:player.bullets
    });
    }
}

//SHOT
function create(){
    if(game.start && player.isDead==false){
        if(reloadTime<0){
            if(fire){
                debugger;
                if(cling || player.weapon.automatic){
                    cling = false;
                    if(wait<0){
                        wait = (player.weapon.fireRate/20);
                        if(player.weapon.ammu<1){
                            player.reload();
                        }
                        else{
                            player.weapon.ammu--;
                            ammu.innerHTML = "Munitions : " + player.weapon.ammu + "/" + player.weapon.reserve;
                            for(i=0;i<player.weapon.nbBullets;i++){
                                var bullet = {
                                    owner : player.pseudo || "Personne",
                                    x: player.x,
                                    y: player.y,
                                    c: 'orange',
                                    r: 3,
                                    angle:player.angle + (Math.random() * ((100-player.weapon.precision)/600)) - (Math.random() * ((100-player.weapon.precision)/600)),
                                    isFlying : true,
                                    speed:{
                                        x : (aim.x-player.x),
                                        y : (aim.y-player.y)
                                    }
                                };
                                player.bullets.push(bullet);
                            }
                        }
                    }
                    else wait--;
                }
            }
        }
        else reloadTime--;
    }
}


/* PLAYER MOVEMENTS */
var Key = {
  _pressed: {},
  
  isDown: function(keyCode) {
    return this._pressed[keyCode];z
  },
  
  onKeydown: function(event) {
    this._pressed[event.keyCode] = true;
  },
  
  onKeyup: function(event) {
    delete this._pressed[event.keyCode];
  }
};

Player.prototype.update = function() {
  if (Key.isDown(90)) this.moveUp();
  if (Key.isDown(81)) this.moveLeft();
  if (Key.isDown(83)) this.moveDown();
  if (Key.isDown(68)) this.moveRight();
  if (Key.isDown(82)) this.reload();
    if(player.game>=0){
        socket.emit("newPos", {
        newX:player.x,
        newY:player.y,
        newC:player.c,
        newAngle:player.angle,
        newBullets:player.bullets
    });
    }
};


//DRAWING OF BULLETS AND PLAYERS
function draw(listPlayers){
    context.clearRect(0,0,1000,600);
    for(i=0;i<listPlayers.length;i++){
        canvasMulti[i].save();
        //canvasMulti[i].clearRect(0,0,1000,600);
        for(j=0;j<listPlayers[i].bullets.length;j++){
            var bullet = listPlayers[i].bullets[j];
            if(bullet.isFlying){
                context.beginPath();
                context.arc(
                    bullet.x,
                    bullet.y,
                    bullet.r,
                    0,
                    Math.PI*2
                );
                context.fillStyle = bullet.c;
                context.fill();
                if(bullet.x<(player.x+10) && bullet.x>(player.x-10) && bullet.y<(player.y+10) && bullet.y>(player.y-10)){
                    player.pv -= 30;
                    PV.innerHTML = "PV : " + player.pv + "/100";
                    if(player.pv<0){
                        player.isDead = true;
                        socket.emit("Dead", player.isDead);
                        PV.innerHTML = "PV : DEAD";
                    }
                    listPlayers[i].bullets[j].isFlying = false;
                }
            }
        }
        
        if(listPlayers[i].isDead==false){
            canvasMulti[i].translate(listPlayers[i].x,listPlayers[i].y);
            canvasMulti[i].rotate(listPlayers[i].angle);
            canvasMulti[i].fillStyle = listPlayers[i].c;
            canvasMulti[i].fillRect(-10,-10,20,20);
            canvasMulti[i].restore();
        }
    }
    aimed.beginPath();
    aimed.arc(aim.x,aim.y,5,0,Math.PI*2);
    aimed.fillStyle ="black";
    aimed.fill();
}

//WEAPONS SELECTION
function Weapon(name, prix, cap, res, auto, frt, rt, moby, awd, dmg, prec, nb){
    this.name = name,
    this.price = prix,
    this.capacity = cap,
    this.ammu = this.capacity,
    this.reserve = res,
    this.fireRate = frt,
    this.reloadTime = rt,
    this.automatic = auto,
    this.mobility = moby,
    this.award = awd,
    this.damage = dmg,
    this.precision = prec,
    this.nbBullets = nb
    
}

//Select Weapon
function selectMainWeapon(num){
    //RIFLES
    var FAMAS = new Weapon("FAMAS", 2250, 25, 90, true, 66, 33, 88, 300, 30, 21, 1) ;
    var G3SG1 = new Weapon("G3SG1", 5000, 20, 90, false, 24, 47, 87, 300, 80, 92, 1) ;
    var SCHMIDT_SCOUT = new Weapon("SCHMIDT SCOUT", 2750, 10, 90, false, 5, 29, 92, 300, 88, 66, 1) ;
    var AUG = new Weapon("AUG", 3500, 30, 90, true, 66, 38, 88, 300, 28, 49, 1) ;
    var AK47 = new Weapon("AK-47", 2500, 30, 90, true, 60, 25, 88, 300, 36, 31, 1) ;
    var M4A1 = new Weapon("M4-A1", 3100, 30, 90, true, 66, 30, 92, 300, 33, 39, 1) ;
    var AWP = new Weapon("AWP", 4750, 10, 30, false, 4, 36, 88, 100, 115, 96, 1);

    //SMGS
    var MP9 = new Weapon("MP9", 1250, 30, 120, true, 85, 21, 96, 600, 26, 15, 1);
    var MP7 = new Weapon("name", 1700, 30, 120, true, 80, 31, 88, 600, 29, 17, 1);
    var BIZON = new Weapon("PP-BIZON", 1400, 64, 120, true, 75, 24, 96, 600, 27, 14, 1);
    var MAC10 = new Weapon("MAC-10", 1400, 30, 100, true, 80, 26, 100, 600, 29, 15, 1);
    var UMP45 = new Weapon("UMP-45", 1700, 25, 100, true, 57, 35, 100, 600, 35, 15, 1);
    var P90 = new Weapon("P90", 2350, 50, 100, true, 86, 33, 98, 300, 26, 15, 1);

    //MACHINES GUNS
    var NEGEV = new Weapon("NEGEV", 5700, 150, 200, true, 100, 57, 85, 300, 35, 18, 1);
    var M249 = new Weapon("M249", 5750, 100, 200, true, 60, 57, 89, 300, 32, 22, 1);

    //SHOTGUNS
    var SAWEDOFF = new Weapon("SAWED OFF", 1200, 7, 32, false, 7, 32, 84, 900, 32, 3, 8);
    var NOVA = new Weapon("NOVA", 1200, 8, 32, false, 7, 30, 88, 900, 26, 5, 9);
    var MAG7 = new Weapon("MAG-7", 1800, 5, 32, false, 7, 24, 90, 900, 30, 5, 8);
    var XM1014 = new Weapon("XM1014", 3000, 7, 32, false, 24, 28, 96, 900, 12, 5, 10);

    var mainWeapon = [FAMAS, G3SG1, SCHMIDT_SCOUT, AUG, AK47, M4A1, AWP, MP9, MP7, BIZON, MAC10, UMP45, P90, NEGEV, M249, SAWEDOFF, NOVA, MAG7, XM1014];
    
    if(player.money>mainWeapon[num].price){
        player.money -= mainWeapon[num].price;
        player.weapon = mainWeapon[num];
        weaponName.innerHTML = player.weapon.name;
        weaponSelection.style.display = "none";
    }
}
function selectSecondWeapon(num){
    //PISTOLS
    var P2000 = new Weapon("P2000", 200, 13, 52, false, 35, 22, 96, 300, 35, 31);
    var TEC9 = new Weapon("TEC-9", 500, 32, 120, true, 50, 25, 96, 300, 33, 19);
    var FIVESEVEN = new Weapon("FIVE-SEVEN", 750, 20, 100, false, 40, 22, 100, 300, 32, 19);
    var GLOCK18 = new Weapon("GLOCK-18", 400, 20, 120, false, 40, 22, 100, 300, 28, 28);
    var DUAL = new Weapon("DUAL BERETTAS", 800, 30, 120, true, 75, 38, 100, 300, 38, 24);
    var DESERTEAGLE = new Weapon("DESERT EAGLE", 650, 7, 35, false, 27, 22, 92, 300, 72, 35);
    
    var secondWeapon = [P2000, TEC9, FIVESEVEN, GLOCK18, DUAL, DESERTEAGLE];
    
    if(player.money>secondWeapon[num].price){
        player.money -= secondWeapon[i].price;
        player.weaponB = secondWeapon[i];
        weaponSelection.style.display = "none";
    }
}

/* JEU - ROUTINE PRINCIPALE*/
window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);
//SHOT
//window.addEventListener("mousedown", create, true);
window.addEventListener("mousedown", function(){fire = true}, true);
window.addEventListener("mouseup", function(){fire = false; if(player.weapon.automatic==false){cling = true;}}, true);
socket.on("refreshGame", function(listPlayers){
    each = listPlayers;
});
function loop(){
    window.requestAnimationFrame(loop);
    player.update();
    update();
    draw(each);
    create();
    /*debugger;*/
}