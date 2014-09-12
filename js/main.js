(function() {
    'use strict';
    var started = false,
        freq = $('.freq').val(),
        buf = new Uint8Array(2048);

    updateGlobalFreq(freq);
    window.audioContext = new AudioContext();
    window.analyser = audioContext.createAnalyser();

    function updateGlobalFreq(freq) {
        if (freq > 5000) {
            freq = 5000;
        } else if (freq < 80) {
            freq = 80;
        }

        window.globalFreq = (freq - 80) / (5000 - 80) * 440;
    }

    $('.tool-group').on('change', function(event) {
        var value = $(this).val();

        if (value === 'slider') {
            initSlider();
            destroyVoice();
        } else if (value === 'voice') {
            initVoice();
            destroySlider();
        }
    });

    initSlider();

    // ================================ SLIDER CONTROL ================================

    function destroySlider() {
        $('.freq').off('change mousemove');
		window.sourceNode.disconnect(window.analyser);
		window.analyser.disconnect(audioContext.destination);
    }

    function initSlider() {
		window.analyser.fftSize = 2048;
		window.sourceNode = audioContext.createOscillator();
		window.sourceNode.connect(window.analyser);
		window.sourceNode.frequency.value = window.globalFreq;
		window.analyser.connect(audioContext.destination);

		window.sourceNode.start(0);

        $('.freq').on('change mousemove', function(event) {
            updateGlobalFreq($(this).val());
            sourceNode.frequency.value = window.globalFreq;
        });
    }

    // ================================ VOICE CONTROL ================================

	getUserMedia({
		audio: true
	}, gotStream);

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
        window.mediaStreamSource = audioContext.createMediaStreamSource(stream);
    }

    function autoCorrelate(buf, sampleRate) {
        var MIN_SAMPLES = 4; // corresponds to an 11kHz signal
        var MAX_SAMPLES = 1000; // corresponds to a 44Hz signal
        var SIZE = 1000;
        var best_offset = -1;
        var best_correlation = 0;
        var rms = 0;
        var foundGoodCorrelation = false;

        if (buf.length < (SIZE + MAX_SAMPLES - MIN_SAMPLES))
            return -1; // Not enough data

        for (var i = 0; i < SIZE; i++) {
            var val = (buf[i] - 128) / 128;
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01)
            return -1;

        var lastCorrelation = 1;
        for (var offset = MIN_SAMPLES; offset <= MAX_SAMPLES; offset++) {
            var correlation = 0;

            for (var i = 0; i < SIZE; i++) {
                correlation += Math.abs(((buf[i] - 128) / 128) - ((buf[i + offset] - 128) / 128));
            }
            correlation = 1 - (correlation / SIZE);
            if ((correlation > 0.9) && (correlation > lastCorrelation))
                foundGoodCorrelation = true;
            else if (foundGoodCorrelation) {
                // short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
                return sampleRate / best_offset;
            }
            lastCorrelation = correlation;
            if (correlation > best_correlation) {
                best_correlation = correlation;
                best_offset = offset;
            }
        }
        if (best_correlation > 0.01) {
            // console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
            return sampleRate / best_offset;
        }
        return -1;
        //	var best_frequency = sampleRate/best_offset;
    }

    function error() {
        alert('error');
    }

	function initVoice() {
		window.mediaStreamSource.connect(window.analyser);

		window.intervalId = setInterval(function() {
			var ac,
				freq;

			window.analyser.getByteTimeDomainData(buf);
			ac = autoCorrelate(buf, audioContext.sampleRate);
			freq = ac === -1 ? 440 : ac;

			updateGlobalFreq(freq);
		}, 50);
	}

	function destroyVoice() {
		window.clearInterval(intervalId);
		window.mediaStreamSource.disconnect(window.analyser);
	}

}());
