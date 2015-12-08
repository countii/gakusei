// NPM libraries
const diff = Meteor.npmRequire('diff');

Meteor.methods({
  submitAnswer: function (question, userAnswer) {
    // Find out whether the user is submitting romaji
    if (question.answer_alternative && userAnswer.match(/([a-z]+)/)) {
      question.answer = question.answer_alternative;

      // Let's also replace long wovels
      // TODO: do it better and with all wovels
      question.answer = question.answer
        .replace('aa |aa\.', 'ā')
        .replace('ou |ou\.', 'ō');
    }

    // Cleanup the answer before diffing
    let cleanAnswer = cleanupAnswer(question.answer),
        cleanUserAnswer = cleanupAnswer(userAnswer),
        diffs = diff.diffChars(cleanAnswer, cleanUserAnswer),
        parts = [],
        errors = 0,
        corrects = 0,
        accuracyForCorrect = question.type === GAME.KANJI ? 100 : 80,
        accuracy;

    // Parse differences
    diffs.forEach(function (part) {
      if (part.removed || part.added) {
        errors += part.count;
      } else {
        corrects += part.count;
      }

      parts.push({
        type: part.added ? 'added' : (part.removed ? 'removed' : null),
        value: part.value
      });
    });

    accuracy = Math.round(100 * corrects / (corrects + errors));
    if (accuracy < 0) {
      accuracy = 0;
    }

    // Normalize data
    userAnswer = capitalizeFirstLetter(userAnswer);
    question.answer = capitalizeFirstLetter(question.answer);

    return Answer.insert({
      correct: accuracy >= accuracyForCorrect,
      accuracy: accuracy,
      parts: parts,
      question: question,
      answer: userAnswer,
      created_at: Date.now()
    });
  }
});

// Removes html tags, parenthesis and their content (e.g. furigana)
// and returns all to lowercase
function cleanupAnswer (str) {
  return str.replace(/(\(.+\))|(<([^>]+)>)|[\.,。 ]/ig, '').toLowerCase();
}