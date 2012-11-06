var SCREEN_WIDTH_PX = 1024;
var SCREEN_HEIGHT_PX = 768;

var ROOM_WIDTH_PX = 480 / 4;
var ROOM_HEIGHT_PX = 480 / 4;

// Stolen from Closure.
function inherits(childCtor, parentCtor) {
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};

// Represents things in the game that tick and have a position on the screen.
function Widget(x, y) {
  // Coordinates relative to parent in pixels.
  this.x = x;
  this.y = y;

  // Size of the widget in pixels.
  this.width = 0;
  this.height = 0;

  // Containing widget.
  this.parent = null;

  // Child widgets.
  this.children = [];
};

Widget.prototype.tick = function() {
  // Default is to do nothing.
}

Widget.prototype.eachChild = function(f) {
  console.log("eachChild on", this.children.length, "children");
  for (var i = 0; i < this.children.length; i++) {
    var child = this.children[i];
    child.eachChild(f);
  }
  f(this);
};

Widget.prototype.setPosition = function(x, y) {
  this.x = x;
  this.y = y;
};

Widget.prototype.getScreenCoords = function() {
  var x = 0;
  var y = 0;
  if (this.parent) {
    var coords = this.parent.getScreenCoords();
    x = coords[0];
    y = coords[1];
  }
  return [this.x + x, this.y + y];
};

Widget.prototype.getCenterScreenCoords = function() {
  var coords = this.getScreenCoords();
  return [coords[0] + this.width / 2, coords[1] + this.height / 2];
};

Widget.prototype.addChild = function(widget) {
  this.children.push(widget);
  widget.parent = this;
};

inherits(Room, Widget);
function Room(x, y) {
  Widget.call(this, x, y);
  this.width = ROOM_WIDTH_PX;
  this.height = ROOM_HEIGHT_PX;
  this.targetRoom = null;
  this.spaces = [0, 0, 0, 0];
};

Room.prototype.draw = function(ctx) {
  ctx.save();
  ctx.strokeStyle = '#ff0000';
  ctx.strokeRect(this.x, this.y, ROOM_WIDTH_PX - 1, ROOM_HEIGHT_PX - 1);

  if (this.targetRoom != null) {
    var from = this.getCenterScreenCoords();
    var to = this.targetRoom.getCenterScreenCoords();
    console.log("stroke", from, to);

    ctx.strokeStyle = '#00ff00';
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
  }
  ctx.restore();
};

Room.prototype.setTargetRoom = function(targetRoom) {
  this.targetRoom = targetRoom;
};

inherits(WeaponsRoom, Room);
function WeaponsRoom(x, y) {
  Room.call(this, x, y);
  this.ticks = 0;
}

WeaponsRoom.prototype.tick = function() {
  this.ticks++;
  console.log("ticked WeaponsRoom", this.ticks);
  if (this.ticks > 1) {
    this.ticks = 0;
  }
};

WeaponsRoom.prototype.draw = function(ctx) {
  WeaponsRoom.superClass_.draw.call(this, ctx);
  if (this.ticks == 0) {
    ctx.fillStyle = '#ff0000';
  } else {
    ctx.fillStyle = '#0000ff';
  }
  ctx.fillRect(this.x, this.y, this.width, this.height);
};

inherits(Ship, Widget);
function Ship(roomsWide, roomsHigh) {
  Widget.call(this, 0, 0);
  this.roomsWide = roomsWide;
  this.roomsHigh = roomsHigh;
  this.width = this.roomsWide * ROOM_WIDTH_PX;
  this.height = this.roomsHigh * ROOM_HEIGHT_PX;

  for (var y = 0; y < this.roomsHigh; y++) {
    for (var x = 0; x < this.roomsWide; x++) {
      if (y == 1 && x == 1) {
        this.addChild(new WeaponsRoom(x * ROOM_WIDTH_PX, y * ROOM_HEIGHT_PX));
      } else {
        this.addChild(new Room(x * ROOM_WIDTH_PX, y * ROOM_HEIGHT_PX));
      }
    }
  }
};

Ship.prototype.draw = function(ctx) {
  // this.superClass_.draw.call(this, ctx);
  ctx.save();
  ctx.translate(this.x, this.y);
  for (var y = 0; y < this.roomsHigh; y++) {
    for (var x = 0; x < this.roomsWide; x++) {
      this.getRoom(x, y).draw(ctx);
    }
  }
  ctx.restore();
};

Ship.prototype.getRoom = function(x, y) {
  return this.children[y * this.roomsWide + x];
};

function Game() {
  this.playerShip = new Ship(4, 4);
  this.enemyShip = new Ship(4, 4);

  // Position the enemy ship on the right hand side of the screen.
  this.enemyShip.setPosition(SCREEN_WIDTH_PX - this.enemyShip.width, 0);

  // Make one of the player's rooms target the enemy ship.
  var e = this.enemyShip.getRoom(2, 2);
  this.playerShip.getRoom(1, 1).setTargetRoom(this.enemyShip.getRoom(2, 2));
}

Game.prototype.draw = function(c) {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, SCREEN_WIDTH_PX, SCREEN_HEIGHT_PX);

  this.playerShip.draw(c);
  this.enemyShip.draw(c);
};

Game.prototype.tick = function() {
  this.playerShip.eachChild(function(room) {
    room.tick();
  });
  this.enemyShip.eachChild(function(room) {
    room.tick();
  });
};

chrome.app.runtime.onLaunched.addListener(function(e) {
  chrome.app.window.create('page.html', {
    width: SCREEN_WIDTH_PX,
    height: SCREEN_HEIGHT_PX,
    frame: 'none',
  }, function(win) {
    win.contentWindow.onload = function() {
      var canvas = win.contentWindow.document.getElementById('c');
      var c = canvas.getContext("2d");

      var g = new Game();
      g.draw(c);

      win.contentWindow.addEventListener('click', function(e) {
        g.tick();
        g.draw(c);
      }, false);
    };
  });
});

