package com.climate.transport.batch;

import com.climate.transport.batch.processor.ClimateCardExcelImporter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ExcelImportRunner implements CommandLineRunner {

    private final ClimateCardExcelImporter importer;

    @Override
    public void run(String... args) throws Exception {
        importer.importExcel();
    }
}
