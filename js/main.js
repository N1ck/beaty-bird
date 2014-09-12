(function() {
    'use strict';
    var started = false;

    window.audioContext = new AudioContext();

    window.sourceNode = audioContext.createOscillator();

    window.analyser = audioContext.createAnalyser();

    function start() {
        analyser.fftSize = 2048;
        sourceNode = audioContext.createOscillator();
        sourceNode.connect(analyser);
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

    $('.test').on('change mousemove', function(event) {
        sourceNode.frequency.value = $(this).val();
    });

}());
