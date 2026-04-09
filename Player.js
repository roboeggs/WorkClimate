class Player{
    constructor(){
        this.osc = new Oscillator();
    };

    setup(){
        this.osc.amp(0);     // volume 0 (until enabled)
        this.osc.start(); 
    };

}