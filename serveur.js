/* LIBRAIRIES */
var express = require('express'), //librairie for make path easier
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'), // Disable HTML caracters (equal htmlentities in PHP)
    fs = require('fs'),
    clients = [];

/* SERVER CONFIG */
app.use(express.static(__dirname + '/public_html'));//all the client part here

var myServer = {
    port : 1337,//hearing port
    listPlayers : [],
    listGame : []
};

/* CLIENTS */
function Client(pseudo, password){
    this.ID = myServer.listPlayers.length,
    this.pseudo = pseudo,
    this.password = password || "",
    this.friends = [];
    this.socket = 0;
    myServer.listPlayers.push(this);
    //console.log(this.pseudo + " have been registered");
}



/* GAME CONFIG */
function Game(name){
    this.ID = myServer.listGame.length,
    this.name = name,
    this.on = true;
    this.listPlayers = [];
    this.teamA = [];
    this.teamB = [];
    myServer.listGame.push(this);
}



/* WHEN SOMEONE IS CONNECTING TO THE SERVER */
io.sockets.on('connection', function (socket) {
    var local = {
        pseudo : "",
        game : -1,
        team : 0,
        ID : -1
    }
    
    
    
    // SOMEONE TRY TO CONNECT
    socket.on('verifLogin', function(identifer) {
        var userExist = false;
        for(i=0;i<myServer.listPlayers.length;i++){
            if(identifer.username == myServer.listPlayers[i].pseudo){
                if(identifer.password == myServer.listPlayers[i].password){
                    userExist = true;
                    socket.join("General");
                    local.pseudo = identifer.username;
                    myServer.listPlayers[i].socket = socket.id;
                    socket.emit("identificationComplete", myServer.listPlayers[i].ID);
                    local.ID = myServer.listPlayers[i].ID;
                    //console.log(myServer.listPlayers[i].pseudo + " is connected"); 
                }
            }
        }
        if(userExist==false){
            socket.emit("identificationFail", false);
        }
    });
    
    
    
    // SOMEONE IS REGISTERING
    socket.on('Registration', function(identifer){
        var client = new Client(identifer.username, identifer.password);
    });
    
    
    
    // CREATION OF A GAME
    socket.on("newGame", function(name){
        var game = new Game(name);
        var postGame = {
            name : game.name,
            ID : game.ID,
            listPlayer : game.listPlayers
        }
    });
    
    
    
    //SHOW ALL GAME OPEN
    socket.on('qListGame', function(x){
        var listGameOn = [];
        function Room(){
            this.name = "",
            this.ID = 0,
            this.listPlayer = []
        }
        for(i=0; i<myServer.listGame.length;i++){
            if(myServer.listGame[i].on){
                var room = new Room();
                room.name = myServer.listGame[i].name;
                room.ID = myServer.listGame[i].ID;
                room.listPlayer = myServer.listGame[i].listPlayers;
                listGameOn.push(room);
            }
        }
        socket.emit("rListGame", listGameOn);
    });
    
    
    
    //JOIN A GAME
    socket.on("joinGame", function(gameJoined){
        if(myServer.listGame[gameJoined.ID].listPlayers.length < 10){
            socket.leave("General");
            socket.join("Game N°" + gameJoined.ID);
            local.game = gameJoined.ID;
            myServer.listGame[gameJoined.ID].listPlayers.push(gameJoined.Player);
            if(myServer.listGame[gameJoined.ID].teamA.length>myServer.listGame[gameJoined.ID].teamB.length){
                myServer.listGame[gameJoined.ID].teamB.push(gameJoined.Player);socket.join("teamB N°"+gameJoined.ID);
                local.team = 2;
            }
            else{
                myServer.listGame[gameJoined.ID].teamA.push(gameJoined.Player);
                 socket.join("teamA N°"+gameJoined.ID);
                local.team = 1;
            }
        }
        else{
            socket.emit("gameFull", false);
        }
    });
    
    
    
    //GIVE LIST PLAYER IN THE SAME ROOM
    socket.on("qlistPlayer", function(numGame){
        giveListPlayer(numGame);
    });
    function giveListPlayer(numGame){
        if(numGame>-1){
            for(i=0;i<=myServer.listGame[numGame].teamA.length;i++){
               io.to("Game N°" + numGame).emit("RefreshTeamA", myServer.listGame[numGame].teamA);
            }
            for(i=0;i<=myServer.listGame[numGame].teamB.length;i++){
               io.to("Game N°" + numGame).emit("RefreshTeamB", myServer.listGame[numGame].teamB);
            }
        }
    }
    
    
    
    //SWITCH TEAM
    socket.on("switchTeam", function(player){
        if(player.team==1){
            if(myServer.listGame[player.game].teamB.length<5){
                for(i=0;i<myServer.listGame[player.game].teamA.length;i++){
                    if(myServer.listGame[player.game].teamA[i].ID==player.ID) myServer.listGame[player.game].teamA.splice(i,1);
                }
                myServer.listGame[player.game].teamB.push(player);
                socket.join("teamB N°" + player.game);
                socket.leave("teamA N°" + player.game);
                local.team = 2;
            }
        }
        else if(player.team==2){
            if(myServer.listGame[player.game].teamA.length<5){
                for(i=0;i<myServer.listGame[player.game].teamB.length;i++){
                    if(myServer.listGame[player.game].teamB[i].ID==player.ID) myServer.listGame[player.game].teamB.splice(i,1);
                }
                myServer.listGame[player.game].teamA.push(player);
                socket.join("teamA N°" + player.game);
                socket.leave("teamB N°" + player.game);
                local.team = 1;
            }
        }
        giveListPlayer(player.game);
    });
    
    
    
    //LAUNCH THE GAME
    socket.on("Ready", function(readyState){
        var launched = true;
        for(i=0;i<myServer.listGame[local.game].listPlayers.length;i++){
            if(myServer.listGame[local.game].listPlayers[i].ID==local.ID){
                myServer.listGame[local.game].listPlayers[i].ready = readyState;
            }
            if(myServer.listGame[local.game].listPlayers[i].ready==false) launched = false;
        }
        if(local.team==1){
            for(i=0;i<myServer.listGame[local.game].teamA.length;i++){
                if(myServer.listGame[local.game].teamA[i].ID==local.ID){
                    myServer.listGame[local.game].teamA[i].ready = readyState;
                }
            }
        }
        else if(local.team==2){
            for(i=0;i<myServer.listGame[local.game].teamB.length;i++){
                if(myServer.listGame[local.game].teamB[i].ID==local.ID){
                    myServer.listGame[local.game].teamB[i].ready = readyState;
                }
            }
        }
        giveListPlayer(local.game);
        if(launched) io.to("Game N°" + local.game).emit("StartGame", true);
    });
    
    
    
    //QUIT A GAME
    socket.on("exitGame", function(player){
        for(j=0;j<myServer.listGame[player.game].listPlayers.length;j++){
            if(myServer.listGame[player.game].listPlayers[j].ID==player.ID){
                myServer.listGame[player.game].listPlayers.splice(j,1);
                socket.leave("Game N°" + player.game);
                socket.join("General");
                socket.leave("teamB N°" + player.game);
                local.game = -1;
            }
        }
        if(player.team==1){
            for(i=0;i<myServer.listGame[player.game].teamA.length;i++){
                if(myServer.listGame[player.game].teamA[i].ID==player.ID){
                    myServer.listGame[player.game].teamA.splice(i,1);
                    socket.leave("teamA N°" + player.game);
                    player.team = 0;
                }
            }
        }
        else if(player.team==2){
            for(i=0;i<myServer.listGame[player.game].teamB.length;i++){
                if(myServer.listGame[player.game].teamB[i].ID==player.ID){
                    myServer.listGame[player.game].teamB.splice(i,1);
                    socket.leave("teamB N°" + player.game);
                    player.team = 0;
                }
            }
        }
        giveListPlayer(player.game);
    });
    
    socket.on('disconnect', function() {
        if(local.game>-1){
            for(j=0;j<myServer.listGame[local.game].listPlayers.length;j++){
                if(myServer.listGame[local.game].listPlayers[j].ID==local.ID){
                    myServer.listGame[local.game].listPlayers.splice(j,1);
                    socket.leave("Game N°" + local.game);
                    socket.leave("General");
                }
            }
        }
        if(local.team==1){
            for(i=0;i<myServer.listGame[local.game].teamA.length;i++){
                if(myServer.listGame[local.game].teamA[i].ID==local.ID){
                    myServer.listGame[local.game].teamA.splice(i,1);
                    socket.leave("teamA N°" + local.game);
                }
            }
        }
        else if(local.team==2){
            for(i=0;i<myServer.listGame[local.game].teamB.length;i++){
                if(myServer.listGame[local.game].teamB[i].ID==local.ID){
                    myServer.listGame[local.game].teamB.splice(i,1);
                    socket.leave("teamB N°" + local.game);
                }
            }
        }
        giveListPlayer(local.game);
    });
    
    
    
    //CHAT
    socket.on("newMsg", function(data){
        data.message = ent.encode(data.message);
        if(data.type == 0) io.to("General").emit("incomingMsg", data);
        else if(data.type==1) io.to("Game N°" + local.game).emit("incomingMsg", data);
        else if(data.type==2) io.to("teamA N°" + local.game).emit("incomingMsg", data);
        else if(data.type==3) io.to("teamB N°" + local.game).emit("incomingMsg", data);
        else socket.broadcast.emit("incomingMsg", data);
    });
    
    //DRAWING PLAYERS
    socket.on("newPos", function(pos){
        var tempo = [];
        for(var k=0;k<myServer.listGame[local.game].listPlayers.length;k++){
            var player = {
                pseudo : "",
                x : 0,
                y : 0,
                c : "black",
                angle : 0,
                bullets : [],
                id : ""
            }
            if(myServer.listGame[local.game].listPlayers[k].ID==local.ID){
                myServer.listGame[local.game].listPlayers[k].x = pos.newX;
                myServer.listGame[local.game].listPlayers[k].y = pos.newY;
                myServer.listGame[local.game].listPlayers[k].c = pos.newC;
                myServer.listGame[local.game].listPlayers[k].angle = pos.newAngle;
                myServer.listGame[local.game].listPlayers[k].bullets = pos.newBullets;
            }
            player.pseudo = myServer.listGame[local.game].listPlayers[k].pseudo;
            player.id = k;
            player.x = myServer.listGame[local.game].listPlayers[k].x;
            player.y = myServer.listGame[local.game].listPlayers[k].y;
            player.c = myServer.listGame[local.game].listPlayers[k].c;
            player.isDead = myServer.listGame[local.game].listPlayers[k].isDead;
            player.angle = myServer.listGame[local.game].listPlayers[k].angle;
            player.bullets = myServer.listGame[local.game].listPlayers[k].bullets;
            tempo.push(player);
        }
        io.to("Game N°" + local.game).emit("refreshGame", tempo);
    });
    //PLAYER HAS BEEN KILLED
    socket.on("Dead", function(deadState){
        for(i=0; i<myServer.listGame[local.game].listPlayers.length;i++){
            if(myServer.listGame[local.game].listPlayers[i].ID==local.ID){
                myServer.listGame[local.game].listPlayers[i].isDead = deadState;
            }
        }
    });
});

server.listen(myServer.port);
console.log("Serveur ON (localhost:" + myServer.port + ")");

var Calderis = new Client("Calderis", "pokemon");
var test = new Client("test", "111");