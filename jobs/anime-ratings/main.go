package main

import (
	"github.com/animenotifier/arn"
	"github.com/fatih/color"
)

var ratings = map[string][]*arn.AnimeRating{}
var finalRating = map[string]*arn.AnimeRating{}

// Note this is using the airing-anime as a template with modfications
// made to it.
func main() {
	color.Yellow("Updating anime ratings")

	allAnimeLists, err := arn.AllAnimeLists()
	arn.PanicOnError(err)

	for _, animeList := range allAnimeLists {
		extractRatings(animeList)
	}

	// Calculate
	for animeID := range finalRating {
		overall := []float64{}
		story := []float64{}
		visuals := []float64{}
		soundtrack := []float64{}

		for _, rating := range ratings[animeID] {
			if rating.Overall != 0 {
				overall = append(overall, rating.Overall)
			}

			if rating.Story != 0 {
				story = append(story, rating.Story)
			}

			if rating.Visuals != 0 {
				visuals = append(visuals, rating.Visuals)
			}

			if rating.Soundtrack != 0 {
				soundtrack = append(soundtrack, rating.Soundtrack)
			}
		}

		finalRating[animeID].Overall = average(overall)
		finalRating[animeID].Story = average(story)
		finalRating[animeID].Visuals = average(visuals)
		finalRating[animeID].Soundtrack = average(soundtrack)
	}

	// Save
	for animeID := range finalRating {
		anime, err := arn.GetAnime(animeID)
		arn.PanicOnError(err)
		anime.Rating = finalRating[animeID]
		arn.PanicOnError(anime.Save())
	}

	color.Green("Finished.")
}

func average(floatSlice []float64) float64 {
	if len(floatSlice) == 0 {
		return arn.DefaultAverageRating
	}

	var sum float64

	for _, value := range floatSlice {
		sum += value
	}

	return sum / float64(len(floatSlice))
}

func extractRatings(animeList *arn.AnimeList) {
	for _, item := range animeList.Items {
		if item.Rating.IsNotRated() {
			continue
		}

		_, found := ratings[item.AnimeID]

		if !found {
			ratings[item.AnimeID] = []*arn.AnimeRating{}
			finalRating[item.AnimeID] = &arn.AnimeRating{}
		}

		ratings[item.AnimeID] = append(ratings[item.AnimeID], item.Rating)
	}
}
