package global.moja.businessintelligence.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import global.moja.businessintelligence.daos.LocationCoverTypesHistories;
import global.moja.businessintelligence.daos.LocationVegetationTypesHistories;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@RunWith(SpringJUnit4ClassRunner.class)
@SpringBootTest
class LocationCoverTypesServiceIT {

    @Autowired
    LocationCoverTypesService locationCoverTypesService;

    static Path resourceDirectory = Paths.get("src", "test", "resources");
    static String absolutePath = resourceDirectory.toFile().getAbsolutePath();

    static String locationCoverTypesHistoryTestFile = absolutePath +
            FileSystems.getDefault().getSeparator() +
            "location_cover_types_history.json";
    static String locationVegetationTypesHistoryTestFile = absolutePath +
            FileSystems.getDefault().getSeparator() +
            "location_vegetation_types_history.json";

    static LocationVegetationTypesHistories locationVegetationTypesHistories;
    static LocationCoverTypesHistories expected;


    @BeforeAll
    public static void setUp() {

        try {
            locationVegetationTypesHistories =
                    new ObjectMapper()
                            .readValue(
                                    Paths.get(locationVegetationTypesHistoryTestFile).toFile(),
                                    LocationVegetationTypesHistories.class);
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        try {
            expected =
                    new ObjectMapper()
                            .readValue(
                                    Paths.get(locationCoverTypesHistoryTestFile).toFile(),
                                    LocationCoverTypesHistories.class);
        } catch (Exception ex) {
            ex.printStackTrace();
        }

    }

    @AfterAll
    public static void tearDown() {
        locationVegetationTypesHistories = null;
        expected = null;
    }

    @Test
    public void Given_DatabaseIdAndLocation_When_Process_Then_TheCorrespondingLocationCoverTypesHistoryWillBeReturned() {

        assertThat(locationCoverTypesService
                .generateLocationCoverTypesHistories(locationVegetationTypesHistories)
                .block())
                .isEqualTo(expected);

    }

}