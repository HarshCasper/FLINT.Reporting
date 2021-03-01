/*
 * Copyright (C) 2021 Moja Global
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */
package global.moja.landusesfluxtypes.handlers.delete;

import global.moja.landusesfluxtypes.repository.LandUsesFluxTypesRepository;
import global.moja.landusesfluxtypes.exceptions.ServerException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;

/**
 * @since 1.0
 * @author Kwaje Anthony <tony@miles.co.ke>
 * @version 1.0
 */
@Component
@Slf4j
public class DeleteLandUseFluxTypeHandler {

	@Autowired
    LandUsesFluxTypesRepository repository;
	
	/**
	 * Deletes a Land Use Flux Type record
	 *
	 * @param request the request containing the details of the Land Use Flux Type record to be deleted
	 * @return the response containing the number of Land Uses Flux Types records deleted
	 */
	public Mono<ServerResponse> deleteLandUseFluxType(ServerRequest request) {

		log.trace("Entering deleteLandUseFluxType()");
		
		return 
			ServerResponse
				.ok()
				.contentType(MediaType.APPLICATION_JSON)
				.body(deleteLandUseFluxTypeById(Long.parseLong(request.pathVariable("id"))),Integer.class)
				.onErrorMap(e -> new ServerException("Land Use Flux Type deletion failed", e));

	}
	
	private Mono<Integer> deleteLandUseFluxTypeById(Long id){
		
		return 
			repository
				.deleteLandUseFluxTypeById(id);
	}

}
