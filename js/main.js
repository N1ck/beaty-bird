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

    $('.freq').on('change mousemove', function(event) {
        console.log($(this).val());
		freq = $(this).val();
        sourceNode.frequency.value = freq;
    });

}());
