// Componente Catalogo Op-Nike: administracion de familias, variantes y reglas SQLite.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.opNikeCatalogView = function opNikeCatalogView() {
  return `
    <section id="opnike-catalog-view" class="view">
      <div class="view-header">
        <div>
          <h2>Catalogo Op-Nike</h2>
          <p id="opNikeCatalogRoot" class="catalog-root">Raiz de plantillas pendiente de cargar</p>
        </div>
        <button id="opNikeRefreshCatalog" class="secondary-button" type="button">Actualizar</button>
      </div>

      <div class="catalog-admin-grid">
        <section class="detail-panel catalog-list-panel">
          <div class="block-title">
            <h3>Variantes y diseños</h3>
            <button id="opNikeNewVariant" type="button">Alta variante</button>
          </div>

          <div class="table-tools" data-filter-target="opNikeVariantsTable">
            <input class="table-search" type="search" placeholder="Filtrar variantes Op-Nike">
            <select class="table-column">
              <option value="all">Todas las columnas</option>
            </select>
            <button class="secondary-button table-clear" type="button">Limpiar</button>
            <span class="table-count">0 registros</span>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Variante</th>
                  <th>Equipo/Diseño</th>
                  <th>Status</th>
                  <th>Scope</th>
                  <th>Validacion</th>
                </tr>
              </thead>
              <tbody id="opNikeVariantsTable"></tbody>
            </table>
          </div>
        </section>

        <section class="detail-panel catalog-editor-panel">
          <div class="block-title">
            <h3 id="opNikeVariantFormTitle">Nueva variante Op-Nike</h3>
            <div class="catalog-actions">
              <button id="opNikeValidateRule" class="secondary-button" type="button">Validar regla</button>
              <button id="opNikeActivateRule" type="button" disabled>Activar</button>
              <button id="opNikeSaveVariant" type="button">Guardar</button>
            </div>
          </div>

          <form id="opNikeVariantForm" class="catalog-form">
            <input type="hidden" name="id">

            <fieldset>
              <legend>Identidad</legend>
              <label>Variant code<input name="variant_code" type="text" required placeholder="H, A, IH, TB, SS"></label>
              <label>Nombre<input name="variant_name" type="text" required placeholder="Home, Away, Green Beret"></label>
              <label>Liga<input name="liga" type="text" placeholder="PLL, WLL"></label>
              <label>Status
                <select name="opnike_rule_status" required>
                  <option value="draft">draft</option>
                  <option value="shadow">shadow</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
              <label class="checkbox-label"><input name="is_active" type="checkbox" checked> Registro activo</label>
              <label class="checkbox-label"><input name="opnike_enabled" type="checkbox"> Habilitado Op-Nike</label>
              <label class="checkbox-label"><input name="is_official_team" type="checkbox"> Equipo oficial</label>
              <label class="checkbox-label"><input name="requires_design_code" type="checkbox"> Requiere diseño</label>
            </fieldset>

            <fieldset>
              <legend>Equipo, diseño y aliases</legend>
              <label>Team market<input name="team_market" type="text" placeholder="Boston"></label>
              <label>Team mascot<input name="team_mascot" type="text" placeholder="Cannons"></label>
              <label>File team name<input name="file_team_name" type="text" placeholder="Boston Cannons"></label>
              <label>Design code<input name="design_code" type="text" placeholder="GNB1"></label>
              <label>Design name<input name="design_name" type="text" placeholder="Green Beret Foundation"></label>
              <label class="span-2">Aliases<textarea name="aliases" rows="2" placeholder="Boston; Cannons; OD Cannons"></textarea></label>
            </fieldset>

            <fieldset>
              <legend>Reglas de ruta y nombre</legend>
              <label>Style scope<input name="opnike_style_scope" type="text" required placeholder="A1000,Y1000"></label>
              <label>Variant root<input name="opnike_variant_root_folder" type="text" required placeholder="STANDARD"></label>
              <label>Group folder<input name="opnike_group_folder_pattern" type="text" required placeholder="NIKE Mens and Youth"></label>
              <label>Product folder<input name="opnike_product_folder_pattern" type="text" required placeholder="{style.product_folder}"></label>
              <label>Version folder<input name="opnike_version_folder_pattern" type="text" placeholder="HOME"></label>
              <label>Team folder<input name="opnike_team_folder_pattern" type="text" placeholder="{team_market} {variant_name}"></label>
              <label>Design folder<input name="opnike_design_folder" type="text" placeholder="{design_name}"></label>
              <label>Style subfolder<input name="opnike_style_subfolder_rule" type="text" placeholder="{style_family}"></label>
              <label>Template code<input name="opnike_template_code" type="text" placeholder="IIH"></label>
              <label>Template pattern<input name="opnike_template_name_pattern" type="text" required placeholder="{liga} {file_team_name} {style} {size}.pdf"></label>
              <label>Output pattern<input name="opnike_output_name_pattern" type="text" required placeholder="{orderId} {liga}-{team_market}{nickname} {style} {size} {identifier}.pdf"></label>
              <label>Fallback mode
                <select name="opnike_fallback_search_mode" required>
                  <option value="">Seleccionar</option>
                  <option value="style_and_size">style_and_size</option>
                  <option value="exact_style_and_size">exact_style_and_size</option>
                </select>
              </label>
              <label>Resolution strategy
                <select name="opnike_resolution_strategy" required>
                  <option value="">Seleccionar</option>
                  <option value="standard_team_version_folder">standard_team_version_folder</option>
                  <option value="special_team_folder">special_team_folder</option>
                  <option value="special_team_folder_with_legacy_version_fallback">special_team_folder_with_legacy_version_fallback</option>
                  <option value="jr_team_folder_with_optional_style_subfolder">jr_team_folder_with_optional_style_subfolder</option>
                  <option value="design_folder">design_folder</option>
                  <option value="design_version_folder">design_version_folder</option>
                </select>
              </label>
              <label class="checkbox-label"><input name="opnike_requires_version_folder" type="checkbox"> Requiere version</label>
              <label class="checkbox-label"><input name="opnike_requires_team_folder" type="checkbox"> Requiere equipo</label>
              <label class="checkbox-label"><input name="opnike_requires_design_folder" type="checkbox"> Requiere diseño folder</label>
              <label class="checkbox-label"><input name="opnike_requires_style_subfolder" type="checkbox"> Requiere style subfolder</label>
            </fieldset>

            <fieldset>
              <legend>Notas controladas</legend>
              <label class="span-2">Notas<textarea name="notes" rows="2" placeholder="Notas operativas, sin codigo editable"></textarea></label>
            </fieldset>
          </form>

          <section class="tracking-panel catalog-validation-panel">
            <div class="tracking-header">
              <div>
                <span class="modal-eyebrow">Validacion visual</span>
                <h4>Regla Op-Nike</h4>
              </div>
              <strong id="opNikeValidationBadge" class="department-badge" data-department="default">Pendiente</strong>
            </div>

            <div id="opNikeMissingFields" class="catalog-chip-list"></div>
            <div id="opNikePreview" class="catalog-preview"></div>
          </section>
        </section>
      </div>

      <section class="detail-panel catalog-family-panel">
        <div class="block-title">
          <h3>Familias de style</h3>
          <button id="opNikeNewFamily" type="button">Alta familia</button>
        </div>

        <div class="catalog-family-grid">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Style</th>
                  <th>Liga</th>
                  <th>Linea</th>
                  <th>Audience</th>
                  <th>Producto</th>
                  <th>Activo</th>
                </tr>
              </thead>
              <tbody id="opNikeFamiliesTable"></tbody>
            </table>
          </div>

          <form id="opNikeFamilyForm" class="catalog-form catalog-family-form">
            <input type="hidden" name="original_style_family">
            <label>Style family<input name="style_family" type="text" required placeholder="A1000"></label>
            <label>Liga<input name="liga" type="text" required placeholder="PLL"></label>
            <label>Line name<input name="line_name" type="text" required placeholder="masculino"></label>
            <label>Audience<input name="audience" type="text" required placeholder="adult"></label>
            <label>Product folder<input name="product_folder" type="text" required placeholder="MENS"></label>
            <label>Garment type<input name="garment_type" type="text" required placeholder="jersey"></label>
            <label class="checkbox-label"><input name="is_active" type="checkbox" checked> Activa</label>
            <label class="span-2">Notas<textarea name="source_notes" rows="2"></textarea></label>
            <button id="opNikeSaveFamily" type="button">Guardar familia</button>
          </form>
        </div>
      </section>
    </section>
  `;
};
