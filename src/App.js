import React from 'react';
import './App.css';

import Board from './Board';
import Dice from './Dice';

import {
  calculateLegalMoves,
  calculateBoardOutcomes,
  scoreBoard,

} from './util';

const initBoard = [
  2, 0, 0, 0, 0, -5,
  0, -3, 0, 0, 0, 5,
  -5, 0, 0, 0, 3, 0,
  5, 0, 0, 0, 0, -2,
];

class App extends React.Component {

  state = {
    chips: [...initBoard],
    whiteHome: 0,
    whiteJail: 0,
    blackHome: 0,
    blackJail: 0,

    cp: 'white',
    turn: 'black',
    dice: [],
    selectedChip: null,
  }

  spaceClicked = (index)=> {

    if(this.state.turn === this.state.cp ) return;

    const direction = this.state.turn === 'black' ? 1 : -1;

    // if no dice, do nothing (wait for roll)
    if( !this.state.dice.length ) return;

    // if turn is in jail
    if( this.state[ this.state.turn + 'Jail' ] ){
      //// if click is on valid move, this.makeMove(index) (return)
      if( (this.state.turn === 'black') && (index > 5) ) return;
      if( (this.state.turn === 'white') && (index < 18) ) return;
      if( (this.state.turn === 'black') && !this.state.dice.includes(index+1) ) return;
      if( (this.state.turn === 'white') && !this.state.dice.includes(24-index) ) return;

      if( (this.state.chips[index] * direction >= 0) ||
          (Math.abs(this.state.chips[index]) === 1) ){

        this.makeMove(index);
      }

      return;
    }

    // (implicit else)

    // if no chip selected
    if( this.state.selectedChip === null ){
      //// if click is on turn's chips, select that chip (return)
      if( ((this.state.chips[index] > 0) && (this.state.turn === 'black')) ||
          ((this.state.chips[index] < 0) && (this.state.turn === 'white')) ){
        this.setState({ selectedChip: index });
      }

    } else {
      // else this is a second click
      //// if the space selected is a valid move, this.makeMove(index)
      if( this.state.dice.includes(direction * (index - this.state.selectedChip)) ){
        if( (this.state.chips[index] * direction >= 0) ||
            Math.abs(this.state.chips[index]) === 1 ){
          this.makeMove(index);
        }
      }

      //// if another click on the selectedChip, unselect the chip
      if( index === this.state.selectedChip ){
        this.setState({ selectedChip: null });
      }
    }
  }

  spaceDoubleClicked = (index)=> {

    // if(this.state.turn === this.state.cp ) return;

    //// if it's a doubleClick & chip can go home, makeMove(go home)

    const legalHomeMoves = calculateLegalMoves(
      this.state.chips, this.state.dice, this.state.turn,
      this.state.whiteJail, this.state.blackJail
    ).filter(move => (
      (move.moveTo === this.state.turn + 'Home') && (move.moveFrom === index)
    ) );

    if( legalHomeMoves.length ){

      let usedDie = this.state.turn === 'black' ? 24 - index : index + 1;

      if( !~this.state.dice.indexOf(usedDie) )
        usedDie = this.state.dice.find(die => die > usedDie);


      this.setState({
        selectedChip: null,
        chips: this.state.chips.map((chip, i)=> (
          i !== index
        ) ? chip : (
          this.state.turn === 'white' ? chip + 1 : chip - 1
        )),

        dice: [
          ...this.state.dice.slice( 0, this.state.dice.indexOf(usedDie) ),
          ...this.state.dice.slice( this.state.dice.indexOf(usedDie) + 1)
        ],

        [this.state.turn + 'Home']: this.state[ this.state.turn + 'Home' ] + 1,

      }, this.checkTurnOver);

    }
  }


  makeMove = (to)=> {
    const direction = this.state.turn === 'black' ? 1 : -1;

    // using this.state.selectedChip / jail as from

    // remove used die from dice
    const usedDie = (this.state.selectedChip !== null) ?
                    direction * (to - this.state.selectedChip) :
                    this.state.turn === 'white' ? 24 - to : to + 1;

    let nextDice = [
      ...this.state.dice.slice( 0, this.state.dice.indexOf(usedDie) ),
      ...this.state.dice.slice( this.state.dice.indexOf(usedDie) + 1)
    ];

    let nextChips = [...this.state.chips];
    let nextWhiteJail = this.state.whiteJail;
    let nextBlackJail = this.state.blackJail;

    // reduce a chip from the from
    if( this.state.selectedChip !== null) nextChips[ this.state.selectedChip ] -= direction;
    else {
      if( this.state.turn === 'black' ) nextBlackJail--;
      if( this.state.turn === 'white' ) nextWhiteJail--;
    }

    // if the to is a single opponent, move it to jail
    if( this.state.chips[to] === -direction ){
      nextChips[to] = direction;
      if( this.state.turn === 'black' ) nextWhiteJail++;
      if( this.state.turn === 'white' ) nextBlackJail++;

    } else {
      // increase a chip in the to
      nextChips[to] += direction;
    }

    // if the to is home, move there, check if game is over

    this.setState({
      dice: nextDice,
      chips: nextChips,
      whiteJail: nextWhiteJail,
      blackJail: nextBlackJail,
      selectedChip: null,
    }, this.checkTurnOver);
  }

  roll = ()=> {
    if( this.state.dice.length ) return;

    if(this.state.turn === this.state.cp ) return;

    this.setState({ dice: [ Math.random()*6 +1, Math.random()*6 +1 ].map(Math.floor) }, ()=>{
      if( this.state.dice[0] === this.state.dice[1] )
        this.setState({
          dice: [...this.state.dice, ...this.state.dice],
        }, this.checkTurnOver);

      else this.checkTurnOver();
    })
  }


  checkTurnOver = ()=>{
    if( this.state.whiteHome === 15 ) console.log('white wins');
    if( this.state.blackHome === 15 ) console.log('black wins');

    const legalMoves = calculateLegalMoves(
      this.state.chips, this.state.dice, this.state.turn,
      this.state.whiteJail, this.state.blackJail
    );

    if( !legalMoves.length ) this.setState({
      turn: ({ black: 'white', white: 'black' })[this.state.turn],
      dice: [],
    }, ()=> {
      if(this.state.turn === this.state.cp ) this.cpRoll();
    });

    return legalMoves.length;
  }

  cpRoll = ()=> {
    this.setState({ dice: [ Math.random()*6 +1, Math.random()*6 +1 ].map(Math.floor) }, ()=>{
      if( this.state.dice[0] === this.state.dice[1] )
        this.setState({
          dice: [...this.state.dice, ...this.state.dice],
      }, this.cpMove);
      else this.cpMove();
    });
  }

  cpMove = ()=> {

    if(!this.checkTurnOver() ) return;

    // we have Dice
    // calculate all possible board outcomes
    const options = calculateBoardOutcomes(
      this.state.chips, this.state.dice, this.state.turn,
       this.state.blackJail, this.state.whiteJail
     );

    //score the outcome boards
    const scoredOptions = options.map(option=>({
      moves: option.moves,
      score: scoreBoard(option.board),
    }));

    // console.log(scoreOptions);


    //select best move combo by score
    let bestMoves;
    if(this.state.cp === 'white')
      bestMoves = scoredOptions.sort((a, b)=> a.score - b.score)[0].moves;

     else
       bestMoves = scoredOptions.sort((a, b)=> b.score - a.score)[0].moves;


    // setTimeout in a loop to trigger the moves.

    for(let i = 0; i < (bestMoves.length); i++){

     setTimeout(()=> {

      if( bestMoves[i].moveFrom === this.state.cp + 'Jail'){

          this.makeMove( bestMoves[i].moveTo );

        } else if( bestMoves[i].moveTo === this.state.cp + 'Home'){
          this.spaceDoubleClicked( bestMoves[i].moveFrom );

        } else{

          this.setState({ selectedChip: bestMoves[i].moveFrom }, ()=> {
            this.makeMove( bestMoves[i].moveTo );
          });
        }
      }, 800 + 900*i);

    }
  }



  render() {
    return (
      <div className="App">
        <div className='game-container'>
          <Board chips={this.state.chips}
                 onClick={this.spaceClicked}
                 onDoubleClick={this.spaceDoubleClicked}
                 selectedChip={this.state.selectedChip}
                 whiteJail={this.state.whiteJail} whiteHome={this.state.whiteHome}
                 blackJail={this.state.blackJail} blackHome={this.state.blackHome} />

          <div className='dice-container'>
            {!this.state.dice.length ? (
               <button onClick={this.roll}>roll</button>
            ) : (
               <Dice dice={this.state.dice} />
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
