(function() {
    'use strict';
    var started = false,
        freq = $('.freq').val();

    window.audioContext = new AudioContext();
    window.sourceNode = audioContext.createOscillator();
    window.analyser = audioContext.createAnalyser();


    function start() {
        analyser.fftSize = 2048;
        sourceNode = audioContext.createOscillator();
        sourceNode.connect(analyser);
        sourceNode.frequency.value = freq;
        analyser.connect(audioContext.destination);
    }

    $(document).keypress(function(e) {
        if (e.keyCode === 32) {
            if (started) {
                sourceNode.stop(0);
            } else {
                start();
                sourceNode.start(0);
            }
            started = !started;
        }
    });

    function initSlider() {
        $('.freq').on('change mousemove', function(event) {
            freq = $(this).val();
            sourceNode.frequency.value = freq;
        });
    }

    $('.tool-group').on('change', function(event) {
        var value = $(this).val();

        if (value === 'slider') {
            initSlider();
        } else {
            $('.freq').off('change mousemove');
        }
    });

    function initManual() {

        getUserMedia({
            audio: true
        }, gotStream);
    }

    function getUserMedia(dictionary, callback) {
        try {
            navigator.getUserMedia =
                navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia;

            navigator.getUserMedia(dictionary, callback, error);
        } catch (e) {
            alert('getUserMedia threw exception :' + e);
        }
    }

    function gotStream(stream) {
        var mediaStreamSource = audioContext.createMediaStreamSource(stream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        mediaStreamSource.connect(analyser);
    }
}());
