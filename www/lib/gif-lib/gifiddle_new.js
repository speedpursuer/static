'use strict';

function Gifiddle() {
            
    var player = new GifPlayer();
    
    return {
        events: new Events(),
        
        setup: function(gif) {        
            
            player.setup(gif, $('#viewport')[0]);

            this.events.emit('initPlayer', player);
          
            player.events.on('error', function(evt) {                
                console.error(evt);
            }.bind(this));
            
            player.start();          
        },
        destroy: function() {
        	player.destroy();                     
        },
        stop: function() {
        	player.stopPlayer();
        }        
    };
}

function GifiddleControls(gifiddle) {

    var domToolbar = $('#toolbar');
    var domControls = $('#toolbar-controls');
    var domButtons = domControls.find('a[data-command]');
 
    var domSliderContainer = domControls.find('.slider-container');
    var domSlider = domSliderContainer.find('.range');


    function updateIcon(playing) {
        if (playing) {
            domButtons.removeClass('ion-play');
            domButtons.addClass('ion-pause');            
        } else {
            domButtons.addClass('ion-play');
            domButtons.removeClass('ion-pause');
        }
    }  
   
    // hide controls on default
    domControls.hide();
    domToolbar.hide();

    // start in "paused" state
    updateIcon(false);

    gifiddle.events.on('initPlayer', function(gifPlayer) {

        updateIcon(false);

        // player events
        gifPlayer.events.on('play', function() {
            updateIcon(true);
        });

        gifPlayer.events.on('pause', function() {
            updateIcon(false);
        });

        gifPlayer.events.on('update', function(frameIndex, frameIndexPrev) {
            domSlider.val(frameIndex);
        });

        gifPlayer.events.on('showCtrl', function() {
            var frameCount = gifPlayer.getFrameCount();

            if (frameCount > 1) {
                domToolbar.fadeIn();
                domControls.fadeIn();
            }

            // update slider range and value
            domSlider.prop('min', 0);
            domSlider.prop('max', frameCount - 1);            
            domSlider.val(0);           
        });
        
        gifPlayer.events.on('destroy', function() {
            domControls.fadeOut();
        });

        // DOM events
        domButtons.off();
        domButtons.on('click', function(event) {
            var cmd = event.target.dataset.command;
                   
            // pause playback when pressing one of the frame control buttons
            if (cmd !== 'toggle') {
                gifPlayer.pause();
            }

            // run function based on the button ID name
            gifPlayer[cmd] && gifPlayer[cmd]();
        });

        domSlider.off();
        domSlider.on('input', function(event) {
            gifPlayer.pause();
            gifPlayer.setFrameIndex(parseInt(event.target.value));
        });
    });
}

function GifiddleAutoplay(gifiddle) {
    gifiddle.events.on('initPlayer', function(gifPlayer) {
        gifPlayer.events.on('readyToPlay', function() {
            var frameCount = gifPlayer.getFrameCount();
            if (frameCount > 1) {
                gifPlayer.play();
            }
        });
    });
}