class Player{
    constructor(){
        this.osc = new Oscillator();
    };

    setup(){
        this.osc.amp(0);     // громкость 0 (пока не включили)
        this.osc.start(); 
    };

}