(function() {
    'use strict';
    var started = false,
        freq = $('.freq').val(),
        buf = new Uint8Array(2048);

    updateGlobalFreq(freq);
    window.audioContext = new AudioContext();
    window.analyser = audioContext.createAnalyser();

    function updateGlobalFreq(freq, customMinFreq, customMaxFreq) {
        var maxFreq = customMaxFreq || 5000,
            minFreq =  customMinFreq|| 80;


        if (freq > maxFreq) {
            freq = maxFreq;
        } else if (freq < minFreq) {
            freq = minFreq;
        }

        window.globalFreq = (freq - minFreq) / (maxFreq - minFreq) * 440;
    }

    $('.tool-group').on('change', function(event) {
        var value = $(this).val();

        if (value === 'slider') {
            destroyClap();
            destroyVoice();
            destroyExternalAudio();
            initSlider();
        } else if (value === 'voice') {
            destroyClap();
            destroySlider();
            destroyExternalAudio();
            initVoice();
        } else if (value === 'clap') {
            destroyVoice();
            destroySlider();
            destroyExternalAudio();
            initClap();
        } else if (value === 'external') {
            destroyVoice();
            destroySlider();
            destroyVoice();
            initExternalAudio();

        }
    });

    initSlider();

    getUserMedia({
        audio: true
    }, gotStream);

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
        if (window.intervalId) {
            window.clearInterval(window.intervalId);
        }

        window.mediaStreamSource.disconnect(window.analyser);
    }

    // ================================ CLAP CONTROL ================================

    function getAverageVolume(array) {
        var values;
        values = _.reduce(array, function(memo, num) {
            return memo + num;
        }, 0);
        return values / array.length;
    };

    function initClap() {
        window.mediaStreamSource.connect(window.analyser);
		window.clapEnabled = true;

        window.intervalId = setInterval(function() {
            var canClap = true,
                volume,
                clapTimeoutId;

            analyser.getByteFrequencyData(buf);
            volume = getAverageVolume(buf) / 100;

            if (volume > 0.3 && canClap) {
                canClap = false;
                window.jumpBird = true;

                // Interval after next clap allowed
                clapTimeoutId = setTimeout(function() {
                    canClap = true;
                }, 500);
            }

        }, 50);
    }

    function destroyClap() {
        if (window.intervalId) {
            window.clearInterval(window.intervalId);
        }

		window.clapEnabled = false;
        window.mediaStreamSource.disconnect(window.analyser);
    }

    // ================================ EXTERNAL AUDIO ================================

    function initExternalAudio() {
            var theBuffer;
            var isPlaying = false;

            var request = new XMLHttpRequest();

            request.open("GET", "my-name.ogg", true);

            request.responseType = "arraybuffer";
            request.onload = function() {
              window.audioContext.decodeAudioData( request.response, function(buffer) {
                    theBuffer = buffer;

                    var now = window.audioContext.currentTime;

                    window.sourceNode = window.audioContext.createBufferSource();
                    window.sourceNode.buffer = theBuffer;
                    window.sourceNode.loop = true;

                    window.sourceNode.connect( window.analyser );
                    window.analyser.connect( window.audioContext.destination );
                    window.sourceNode.start( now );
                    isPlaying = true;


                    window.intervalId = setInterval(function() {

						var array = new Uint8Array(window.analyser.frequencyBinCount);
                        window.analyser.getByteTimeDomainData(array);

                        var volume = getAverageVolume(array);
                        console.log(volume);

                        //var ac = autoCorrelate( buf, window.audioContext.sampleRate );

                        //var freq = ac === -1 ? 440 : ac;

                        // console.log(freq)
                        updateGlobalFreq(volume, 120, 130);


                    }, 50);

                });
            }
            request.send();
    }

    function destroyExternalAudio(){
        //stop playing and return
        window.sourceNode.stop(0)
        window.sourceNode.disconnect(window.analyser );
        window.analyser.disconnect(window.audioContext.destination );

        if (window.intervalId) {
            window.clearInterval(window.intervalId);
        }
    }

}());
