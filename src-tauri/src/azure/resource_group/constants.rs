
// can be expanded with a filter and top query param
pub fn get_resource_groups(subscription_id: &str) -> String {
  format!(
    "https://management.azure.com/subscriptions/{}/resourcegroups?api-version=2021-04-01",
    subscription_id)
}