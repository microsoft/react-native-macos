# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

class SPMManager
  def initialize()
     @dependencies_by_pod = {}
  end

  def dependency(pod_spec, url:, requirement:,  products:)
    @dependencies_by_pod[pod_spec.name] ||= []
    @dependencies_by_pod[pod_spec.name] << { url: url, requirement: requirement, products: products}
  end

  def apply_on_post_install(installer)
    project = installer.pods_project

    log 'Cleaning old SPM dependencies from Pods project'
    clean_spm_dependencies_from_target(project, @dependencies_by_pod)
    log 'Adding SPM dependencies to Pods project'
    @dependencies_by_pod.each do |pod_name, dependencies|
      dependencies.each do |spm_spec|
        log "Adding SPM dependency on product #{spm_spec[:products]}"
        add_spm_to_target(
          project,
          project.targets.find { |t| t.name == pod_name},
          spm_spec[:url],
          spm_spec[:requirement],
          spm_spec[:products]
        )
        log " Adding workaround for Swift package not found issue"
        target = project.targets.find { |t| t.name == pod_name}
        target.build_configurations.each do |config|
          target.build_settings(config.name)['SWIFT_INCLUDE_PATHS'] ||= ['$(inherited)']
          search_path = '${SYMROOT}/${CONFIGURATION}${EFFECTIVE_PLATFORM_NAME}/'
          unless target.build_settings(config.name)['SWIFT_INCLUDE_PATHS'].include?(search_path)
            target.build_settings(config.name)['SWIFT_INCLUDE_PATHS'].push(search_path)
          end
        end
      end
    end

    unless @dependencies_by_pod.empty?
      log_warning "If you're using Xcode 15 or earlier you might need to close and reopen the Xcode workspace"
      unless ENV["USE_FRAMEWORKS"] == "dynamic"
        @dependencies_by_pod.each do |pod_name, dependencies|
          log_warning "Pod #{pod_name} is using swift package(s) #{dependencies.map{|i| i[:products]}.flatten.uniq.join(", ")} with static linking, this might cause linker errors. Consider using USE_FRAMEWORKS=dynamic, see https://github.com/facebook/react-native/pull/44627#issuecomment-2123119711 for more information"
        end
      end
    end
  end

  private

  # Creates a new object in the project with a UUID guaranteed not to collide
  # with any UUID already present in the project.
  #
  # `Pod::Project` overrides `generate_available_uuid_list` with a fast,
  # counter-based scheme (`<sha prefix><counter>0`) that deliberately skips
  # collision checks, on the assumption that the whole Pods project is generated
  # in a single pass. That assumption does not hold here: we run in a
  # `post_install` hook, and the generator's counter can be out of sync with the
  # UUIDs already assigned to existing objects (e.g. when the project has been
  # reloaded from disk during an incremental install, the counter restarts at 0
  # while the root object still occupies `<prefix>00000000`). Using `project.new`
  # directly can therefore hand back a UUID that is already in use and overwrite
  # an existing object (notably the root `PBXProject`), producing a Pods project
  # Xcode refuses to load. We keep the deterministic scheme but probe forward
  # until we find a UUID that is actually free.
  def new_object(project, klass)
    uuid = project.generate_uuid
    uuid = project.generate_uuid while project.objects_by_uuid.key?(uuid)
    object = klass.new(project, uuid)
    object.initialize_defaults
    object
  end

  def log(msg)
    ::Pod::UI.puts "[SPM] #{msg}"
  end

  def log_warning(msg)
    ::Pod::UI.puts "\n\n[SPM] WARNING!!! #{msg}\n\n"
  end

  def clean_spm_dependencies_from_target(project, new_targets)
    project.root_object.package_references.delete_if { |pkg|
      (pkg.class == Xcodeproj::Project::Object::XCRemoteSwiftPackageReference) ||
      (pkg.class == Xcodeproj::Project::Object::XCLocalSwiftPackageReference)
    }
  end

  def add_spm_to_target(project, target, url, requirement, products)
    # Determine if this is a local path or remote URL
    is_local_path = File.exist?(url)

    if is_local_path
      pkg_class = Xcodeproj::Project::Object::XCLocalSwiftPackageReference
      pkg = project.root_object.package_references.find { |p| p.class == pkg_class && p.relative_path == url }
      if !pkg
        pkg = new_object(project, pkg_class)
        pkg.relative_path = url
        log(" Adding local package to workspace: #{pkg.inspect}")
        project.root_object.package_references << pkg
      end
    else
      pkg_class = Xcodeproj::Project::Object::XCRemoteSwiftPackageReference
      pkg = project.root_object.package_references.find { |p| p.class == pkg_class && p.repositoryURL == url }
      if !pkg
        pkg = new_object(project, pkg_class)
        pkg.repositoryURL = url
        pkg.requirement = requirement
        log(" Adding remote package to workspace: #{pkg.inspect}")
        project.root_object.package_references << pkg
      end
    end

    ref_class = Xcodeproj::Project::Object::XCSwiftPackageProductDependency
    products.each do |product_name|
      ref = target.package_product_dependencies.find do |r|
        r.class == ref_class && r.package == pkg && r.product_name == product_name
      end
      next if ref

      log(" Adding product dependency #{product_name} to #{target.name}")
      ref = new_object(project, ref_class)
      ref.package = pkg
      ref.product_name = product_name
      target.package_product_dependencies << ref
    end
  end
end

SPM = SPMManager.new
