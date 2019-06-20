import ApiHelper from './ApiHelper';

export default class TopLanguagesChart {
  constructor(interval) {
    this._interval = interval;
  }

  async getDates() {
    if (typeof this._dates === 'undefined') {
      let dates = await ApiHelper.buildDates(this._interval);
      // From this point on we only need the date as a string
      this._dates = dates.map(date => date.toISOString());
    }

    return this._dates;
  }

  async getSeries() {
    const dates = await this.getDates();
    const scoresFromApi = await ApiHelper.getAllScores(dates);
    const scoresByDate = TopLanguagesChart._organizeScoresByDate(scoresFromApi);
    const topScores = await this._calculateTopScores(dates, scoresByDate);
    const formattedSeriesData = await this._formatDataForChart(topScores);

    return formattedSeriesData;
  }

  // Organize scores by date so we can access each one directly
  static _organizeScoresByDate(scores) {
    let scoresByDate = {};
    for (let i = 0; i < scores.length; i++) {
      const date = scores[i].date;
      const languageName = scores[i].language.name;
      const points = scores[i].points;

      if (!scoresByDate.hasOwnProperty(date)) {
        scoresByDate[date] = {};
      }
      scoresByDate[date][languageName] = points;
    }

    return scoresByDate;
  }

  async _calculateTopScores(dates, scoresByDate) {
    let topScores = {};

    for (let i = 0; i < dates.length; i++) {
      let date = dates[i];
      // TODO: make this a map to guarantee order
      topScores[date] = {};

      // Sort scores so we can get the top N and do an ordinal ranking for a bump chart
      let sortedKeys = Object.keys(scoresByDate[date]).sort(function (a, b) {
        return (scoresByDate[date][b] - scoresByDate[date][a]);
      });

      for (let i = 0; i < ApiHelper.NUMBER_OF_LANGUAGES; i++) {
        let languageName = sortedKeys[i];
        topScores[date][languageName] = scoresByDate[date][languageName];
      }
    }

    return topScores;
  }

  async _formatDataForChart(topScores) {
    let formattedScores = [];
    const allTopLanguages = TopLanguagesChart._getAllTopLanguages(topScores);

    for (let languageName of allTopLanguages) {
      formattedScores.push(
        {
          title: languageName,
          data: [],
        }
      );
    }

    let datesForChart = await this.getDates();
    for (let i = 0; i < datesForChart.length; i++) {
      let date = datesForChart[i];

      let formattedScoresIndex = 0;
      for (let languageName of allTopLanguages) {
        let score = null;
        let rank = null;
        if (topScores[date].hasOwnProperty(languageName)) {
          score = topScores[date][languageName];
          // TODO: this should be a map to guarantee order
          rank = Object.keys(topScores[date]).indexOf(languageName) + 1;
        }

        formattedScores[formattedScoresIndex].data.push(
          {
            x: i,
            // Use the ordinal number ranking for the chart data in order to create a bump chart
            y: rank,
            // TODO: don't add hintTitle and hintValue if score is null
            hintTitle: languageName,
            // Add the actual score as a separate property so it can be used for hints on mouseover
            hintValue: score,
          }
        );
        formattedScoresIndex ++;
      }
    }

    return formattedScores;
  }

  static _getAllTopLanguages(topScores) {
    let allTopLanguages = [];

    for (let date in topScores) {
      for (let languageName in topScores[date]) {
        if (!allTopLanguages.includes(languageName)) {
          allTopLanguages.push(languageName);
        }
      }
    }

    return allTopLanguages;
  }
}
